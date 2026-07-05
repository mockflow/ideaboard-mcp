/**
 * MockFlow IdeaBoard - Local MCP Server (Standalone CLI)
 *
 * Lightweight local MCP server that proxies tool calls to app.mockflow.com.
 * Authenticates via OAuth token obtained during `mockflow-ideaboard-mcp login`.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');
const auth = require('./auth');
const createRateLimiter = require('./rateLimiter');

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
var BACKEND_URL = process.env.MOCKFLOW_BACKEND_URL || 'https://app.mockflow.com';

/**
 * Check npm registry for a newer version. Fire-and-forget — never blocks startup.
 */
function checkForUpdate() {
	var pkg = require('../package.json');
	axios.get('https://registry.npmjs.org/' + encodeURIComponent(pkg.name) + '/latest', { timeout: 3000 })
		.then(function(res) {
			var latest = res.data && res.data.version;
			if (latest && latest !== pkg.version && latest.localeCompare(pkg.version, undefined, {numeric: true}) > 0) {
				console.log('');
				console.log('  Update available: ' + pkg.version + ' \u2192 ' + latest);
				console.log('  Run: npm install -g ' + pkg.name);
				console.log('');
			}
		})
		.catch(function() { /* ignore — offline or registry unreachable */ });
}

/**
 * Validate user and get rate limits from backend.
 * Returns { limit, windowMs }. Exits if verification fails.
 *
 * Expected backend response:
 *   { valid: true, isBasic: bool, rateLimit: number, rateWindowMs: number, ... }
 */
async function getServerRateLimits(creds) {
	if (!creds.access_token) {
		console.error('[MCP] No access token. Run "mockflow-ideaboard-mcp login" to authenticate.');
		process.exit(1);
	}

	try {
		var validateUrl = process.env.MOCKFLOW_VALIDATE_URL || 'https://mockflow.com/ideaboard_oauth_validate';
		var response = await axios.post(validateUrl, {
			access_token: creds.access_token
		}, { timeout: 5000 });

		if (!response.data || !response.data.valid) {
			throw new Error('Invalid or expired token. Run "mockflow-ideaboard-mcp login" to re-authenticate.');
		}

		var data = response.data;

		if (data.rateLimit == null || data.rateWindowMs == null) {
			throw new Error('Rate limit info unavailable. Please update your MockFlow account or try again later.');
		}

		return { limit: data.rateLimit, windowMs: data.rateWindowMs };
	} catch (e) {
		console.error('[MCP] Authentication failed:', e.message);
		process.exit(1);
	}
}

async function start(port, options) {
	port = port || DEFAULT_PORT;
	options = options || {};
	var spaceId = options.spaceId || null;

	// Load credentials
	var creds = auth.loadCredentials();
	if (!creds) {
		console.log('');
		console.log('No credentials found. Run "mockflow-ideaboard-mcp login" first.');
		console.log('');
		process.exit(1);
		return;
	}

	// Initialize handler and rate limits first (before printing help)
	var mcpHandler = new MCPHandler(false, {
		tools: REGISTRY.getToolDefinitions(),
		serverName: 'MockFlow IdeaBoard',
		logger: function() {
			if (process.env.MCP_DEBUG) {
				console.log.apply(console, ['[MCP]'].concat(Array.prototype.slice.call(arguments)));
			}
		}
	});

	var rateLimit = await getServerRateLimits(creds);
	var windowSec = Math.round(rateLimit.windowMs / 1000);
	var windowLabel = windowSec >= 60 ? Math.round(windowSec / 60) + 'm' : windowSec + 's';
	var rateLimiter = createRateLimiter(rateLimit);

	// Check if desktop app MCP is already running
	var desktopWarning = '';
	var portFile = path.join(os.homedir(), '.mockflow', 'mcp-port');
	if (fs.existsSync(portFile)) {
		try {
			var existingPort = parseInt(fs.readFileSync(portFile, 'utf8').trim());
			if (existingPort === port) {
				desktopWarning = '\nWarning: MockFlow Desktop app MCP server may already be running on port ' + existingPort + '\nUse --port=<number> to choose a different port, or close the desktop app first.\n';
			}
		} catch (e) {}
	}

	// Print startup help
	console.log('');
	console.log('MockFlow IdeaBoard - Local MCP Server');
	console.log('======================================');
	console.log('User: ' + creds.userid);
	if (spaceId) console.log('Space: ' + spaceId);
	console.log('Rate limit: ' + rateLimit.limit + ' tool calls per ' + windowLabel);
	if (desktopWarning) console.log(desktopWarning);
	console.log('');
	console.log('What it does:');
	console.log('  Connects your AI coding assistant (Claude Code, Cursor, Copilot)');
	console.log('  to MockFlow IdeaBoard for creating visual diagrams and boards.');
	console.log('');
	console.log('Available visualizations:');
	console.log('  Flowcharts, Mind Maps, Swimlanes, Knowledge Graphs, Timelines,');
	console.log('  Cloud Architecture (AWS/Azure/GCP), ER Diagrams, Charts,');
	console.log('  Kanban Boards, Gantt Charts, Calendars, Storyboards,');
	console.log('  Customer Journey Maps, Whiteboards, Spreadsheets, Tables,');
	console.log('  Geographic Maps, Markdown Documents,');
	console.log('  Wireframes (lo-fi/hi-fi UI screens, sections & widgets)');
	console.log('');
	console.log('Usage:');
	console.log('  Just ask your AI assistant to create any visualization.');
	console.log('  Example: Create a mindmap for SaaS marketing using ideaboard cli.');	
	console.log('');
	console.log('  Add to an existing project by passing a board URL:');
	console.log('  Example: "Add a HR process flowchart to https://app.mockflow.com/board/Ma6e1..."');
	console.log('  This places the new visualization near existing content');
	console.log('  instead of creating a new project.');
	console.log('');
	console.log('Contextual:');
	console.log('  Works with your codebase and documents.');
	console.log('  Example: "Convert this document into a mindmap"');
	console.log('');
	console.log('Skills:');
	console.log('  Extend your AI assistant with pre-built IdeaBoard skills for brainstorming.');
	console.log('  Examples: Emoji Decision Flowchart, Concept Knowledge Graph, Historical Event Timeline');
	console.log('  Browse and install: https://mockflow.com/ideaboard/skills');

	// Check for npm updates (non-blocking)
	checkForUpdate();

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
				source: 'cli',
				rateLimit: rateLimiter.getLimitsInfo()
			});
		}
	});

	// Inject user credentials before rate limiter
	mcpApp.use('/mcp', function(req, res, next) {
		req.user = { userid: creds.userid, clientid: creds.clientid || '', scope: creds.scope || 'read write' };
		next();
	});

	// MCP JSON-RPC endpoint
	mcpApp.post('/mcp', rateLimiter.middleware, async function(req, res) {
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
				// Sanitize flowchart data (remove orphan links, round coordinates)
				if (params.name === 'render_flowchart' || params.name === 'render_swimlane' || params.name === 'render_cloudarchitecture') {
					REGISTRY.sanitizeFlowData(params.arguments || {});
				}
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

	// Extract project ID from projectUrl if provided (add to existing project)
	if (payload.projectUrl) {
		var urlMatch = payload.projectUrl.match(/\/board\/([A-Za-z0-9]+)/);
		if (urlMatch && urlMatch[1]) {
			payload._projectId = urlMatch[1];
		}
		delete payload.projectUrl;
	}

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
