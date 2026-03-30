/**
 * MockFlow IdeaBoard - Local MCP Server (Standalone CLI)
 *
 * Lightweight local MCP server that proxies tool calls to app.mockflow.com.
 * Authenticates via OAuth token obtained during `mockflow-mcp login`.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');
const auth = require('./auth');

var MCPHandler;
try {
	MCPHandler = require('../mcpHandler');
} catch (e) {
	MCPHandler = require('../../ideaboard-mcp/mcpHandler');
}

var REGISTRY;
try {
	REGISTRY = require('../ideaboard-mcp-component-registry');
} catch (e) {
	REGISTRY = require('../../ideaboard-mcp/ideaboard-mcp-component-registry');
}

var DEFAULT_PORT = 21193;
var BACKEND_URL = 'https://app.mockflow.com';

function start(port, options) {
	port = port || DEFAULT_PORT;
	options = options || {};
	var spaceId = options.spaceId || null;

	// Load credentials
	var creds = auth.loadCredentials();
	if (!creds) {
		console.log('');
		console.log('No credentials found. Run "mockflow-mcp login" first.');
		console.log('');
		process.exit(1);
		return;
	}

	console.log('');
	console.log('MockFlow IdeaBoard - Local MCP Server');
	console.log('======================================');
	console.log('User: ' + creds.userid);
	if (spaceId) console.log('Space: ' + spaceId);

	// Check if desktop app MCP is already running
	var portFile = path.join(os.homedir(), '.mockflow', 'mcp-port');
	if (fs.existsSync(portFile)) {
		try {
			var existingPort = parseInt(fs.readFileSync(portFile, 'utf8').trim());
			if (existingPort === port) {
				console.log('');
				console.log('Warning: MockFlow Desktop app MCP server may already be running on port ' + existingPort);
				console.log('Use --port=<number> to choose a different port, or close the desktop app first.');
				console.log('');
			}
		} catch (e) {}
	}

	var mcpHandler = new MCPHandler(false, {
		tools: REGISTRY.getToolDefinitions(),
		serverName: 'MockFlow IdeaBoard',
		logger: function() {
			if (process.env.MCP_DEBUG) {
				console.log.apply(console, ['[MCP]'].concat(Array.prototype.slice.call(arguments)));
			}
		}
	});

	var mcpApp = express();

	mcpApp.use(cors({
		origin: '*',
		methods: ['GET', 'POST', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Accept', 'Mcp-Session-Id', 'MCP-Protocol-Version'],
		exposedHeaders: ['Mcp-Session-Id']
	}));
	mcpApp.use(bodyParser.json({ limit: '10mb' }));

	// Health / SSE endpoint
	mcpApp.get('/mcp', function(req, res) {
		var accept = req.headers['accept'] || '';
		if (accept.indexOf('text/event-stream') !== -1) {
			res.setHeader('Content-Type', 'text/event-stream');
			res.setHeader('Cache-Control', 'no-cache');
			res.setHeader('Connection', 'keep-alive');
			res.write('event: open\n');
			res.write('data: {"status": "connected", "auth": "authenticated as ' + creds.userid + '"}\n\n');

			var keepAlive = setInterval(function() {
				res.write('event: ping\n');
				res.write('data: {}\n\n');
			}, 30000);

			req.on('close', function() {
				clearInterval(keepAlive);
			});
		} else {
			res.json({
				status: 'ok',
				server: 'MockFlow IdeaBoard Local MCP Server',
				version: '1.0.0',
				protocol: 'MCP 2025-03-26',
				authenticated: true,
				user: creds.userid,
				source: 'cli'
			});
		}
	});

	// MCP JSON-RPC endpoint
	mcpApp.post('/mcp', async function(req, res) {
		try {
			var jsonRpcRequest = req.body;

			if (!jsonRpcRequest || typeof jsonRpcRequest !== 'object') {
				res.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
				return;
			}

			var id = jsonRpcRequest.id;
			var method = jsonRpcRequest.method;
			var params = jsonRpcRequest.params || {};

			// Intercept tools/call — proxy to MockFlow backend
			if (method === 'tools/call' && params.name && params.name.startsWith('render_')) {
				try {
					var result = await proxyToBackend(params.name, params.arguments || {}, creds, spaceId);
					res.json({ jsonrpc: '2.0', id: id, result: result });
				} catch (error) {
					res.json({
						jsonrpc: '2.0', id: id,
						result: {
							content: [{ type: 'text', text: 'Error: ' + error.message }],
							isError: true
						}
					});
				}
				return;
			}

			// Protocol methods (initialize, tools/list, ping) — handled by mcpHandler
			var result;
			try {
				result = await mcpHandler.handleRequest(method, params, req);
			} catch (error) {
				res.json({ jsonrpc: '2.0', id: id, error: { code: -32603, message: error.message } });
				return;
			}
			res.json({ jsonrpc: '2.0', id: id, result: result });
		} catch (error) {
			console.error('[MCP] Server error:', error);
			res.json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal server error' } });
		}
	});

	var server = mcpApp.listen(port, '127.0.0.1', function() {
		var actualPort = server.address().port;
		console.log('');
		console.log('MCP server running on http://localhost:' + actualPort + '/mcp');
		console.log('');
		console.log('Add to your AI client:');
		console.log('');
		console.log('  Claude Code:');
		console.log('    claude mcp add --transport http -s user mockflow-ideaboard http://localhost:' + actualPort + '/mcp');
		console.log('');
		console.log('  Cursor (Settings > MCP):');
		console.log('    { "mcpServers": { "mockflow-ideaboard": { "url": "http://localhost:' + actualPort + '/mcp" } } }');
		console.log('');
		console.log('Press Ctrl+C to stop.');
	});

	server.on('error', function(err) {
		if (err.code === 'EADDRINUSE') {
			console.error('');
			console.error('Port ' + port + ' is already in use.');
			console.error('Use --port=<number> for a different port, or close the other instance.');
			console.error('');
			process.exit(1);
		} else {
			console.error('Failed to start MCP server:', err.message);
			process.exit(1);
		}
	});

	// Graceful shutdown
	process.on('SIGINT', function() {
		console.log('\nStopping MCP server...');
		server.close();
		process.exit(0);
	});
	process.on('SIGTERM', function() {
		server.close();
		process.exit(0);
	});
}

/**
 * Proxy a tool call to the MockFlow backend.
 * Sends the OAuth access_token as Authorization header.
 */
async function proxyToBackend(toolName, args, creds, spaceId) {
	var actionType = toolName.replace('render_', '');
	var endpoint = BACKEND_URL + '/mcp/render_' + actionType;

	var headers = {
		'Content-Type': 'application/json; charset=utf-8'
	};

	// Send OAuth token if available
	if (creds.access_token) {
		headers['Authorization'] = 'Bearer ' + creds.access_token;
	}

	var payload = { ...args };

	// Include user context
	if (creds.userid) {
		payload._oauth = {
			userid: creds.userid,
			clientid: creds.clientid || '',
			scope: creds.scope || 'read write'
		};
	}

	// Include target space if specified
	if (spaceId) {
		payload._spaceId = spaceId;
	}

	try {
		var response = await axios.post(endpoint, payload, {
			headers: headers,
			timeout: 60000
		});

		var data = response.data;

		if (data.success) {
			return {
				content: [
					{ type: 'text', text: 'URL: ' + data.url },
					{ type: 'text', text: 'Thumbnail: ' + data.thumbnailUrl }
				],
				isError: false
			};
		}
		throw new Error(data.error || 'Backend returned failure');
	} catch (error) {
		if (error.code === 'ECONNREFUSED') {
			throw new Error('Cannot reach app.mockflow.com. Check your internet connection.');
		}
		if (error.response) {
			throw new Error('Backend error: ' + error.response.status);
		}
		throw error;
	}
}

module.exports = { start: start };
