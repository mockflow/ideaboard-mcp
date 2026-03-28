/**
 * MockFlow IdeaBoard - Local MCP Server (Standalone CLI)
 *
 * Lightweight local MCP server that proxies tool calls to app.mockflow.com.
 * Works with Claude Code, Cursor, VS Code Copilot, and other MCP clients.
 *
 * Usage:
 *   mockflow-mcp login    # One-time API key setup
 *   mockflow-mcp          # Start server on port 21193
 *   mockflow-mcp --port=8888  # Custom port
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const os = require('os');
const auth = require('./auth');

var MCPHandler;
// Support both bundled (npm package) and local dev (sibling directory) mcpHandler
try {
	MCPHandler = require('../mcpHandler');
} catch (e) {
	MCPHandler = require('../../ideaboard-mcp/mcpHandler');
}

var DEFAULT_PORT = 21193;

/**
 * Start the local MCP server.
 * @param {number} port - Port to listen on
 */
function start(port) {
	port = port || DEFAULT_PORT;

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

	var userContext = {
		userid: creds.userid,
		clientid: creds.clientid || '',
		scope: 'read write'
	};

	var mcpHandler = new MCPHandler(false, {
		logger: function() {
			if (process.env.MCP_DEBUG) {
				console.log.apply(console, ['[MCP]'].concat(Array.prototype.slice.call(arguments)));
			}
		},
		userProvider: function() {
			return userContext;
		}
		// No contextProvider for CLI — always creates new boards
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
			res.write('data: {"status": "connected", "auth": "authenticated as ' + userContext.userid + '"}\n\n');

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
				user: userContext.userid,
				source: 'cli'
			});
		}
	});

	// MCP JSON-RPC endpoint
	mcpApp.post('/mcp', async function(req, res) {
		try {
			var jsonRpcRequest = req.body;

			if (!jsonRpcRequest || typeof jsonRpcRequest !== 'object') {
				res.json({
					jsonrpc: '2.0',
					id: null,
					error: { code: -32700, message: 'Parse error' }
				});
				return;
			}

			var id = jsonRpcRequest.id;
			var method = jsonRpcRequest.method;
			var params = jsonRpcRequest.params || {};

			var result;
			try {
				result = await mcpHandler.handleRequest(method, params, req);
			} catch (error) {
				res.json({
					jsonrpc: '2.0',
					id: id,
					error: { code: -32603, message: 'Internal error: ' + error.message }
				});
				return;
			}

			res.json({
				jsonrpc: '2.0',
				id: id,
				result: result
			});
		} catch (error) {
			console.error('[MCP] Server error:', error);
			res.json({
				jsonrpc: '2.0',
				id: null,
				error: { code: -32603, message: 'Internal server error' }
			});
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
		console.log('    claude mcp add mockflow-ideaboard --transport http --url http://localhost:' + actualPort + '/mcp');
		console.log('');
		console.log('  Cursor (Settings > MCP):');
		console.log('    { "mcpServers": { "mockflow-ideaboard": { "url": "http://localhost:' + actualPort + '/mcp" } } }');
		console.log('');
		console.log('  VS Code Copilot (.vscode/mcp.json):');
		console.log('    { "servers": { "mockflow-ideaboard": { "type": "http", "url": "http://localhost:' + actualPort + '/mcp" } } }');
		console.log('');
		console.log('Press Ctrl+C to stop.');
	});

	server.on('error', function(err) {
		if (err.code === 'EADDRINUSE') {
			console.error('');
			console.error('Port ' + port + ' is already in use.');
			console.error('The MockFlow Desktop app may be running its own MCP server on this port.');
			console.error('');
			console.error('Options:');
			console.error('  1. Use a different port: mockflow-mcp --port=<number>');
			console.error('  2. Close the MockFlow Desktop app first');
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

module.exports = { start: start };
