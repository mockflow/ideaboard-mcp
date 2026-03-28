#!/usr/bin/env node

/**
 * MockFlow IdeaBoard MCP - CLI Entry Point
 *
 * Commands:
 *   mockflow-mcp                  Start local MCP server (default port 21193)
 *   mockflow-mcp --port=8888      Start on custom port
 *   mockflow-mcp login            Set up API key credentials
 *   mockflow-mcp --help           Show usage
 */

var args = process.argv.slice(2);
var command = args[0];

if (command === 'login') {
	require('../lib/auth').login();
} else if (command === '--help' || command === '-h' || command === 'help') {
	console.log('');
	console.log('MockFlow IdeaBoard MCP - Local MCP Server');
	console.log('');
	console.log('Usage:');
	console.log('  mockflow-mcp                  Start local MCP server');
	console.log('  mockflow-mcp --port=<number>  Start on custom port (default: 21193)');
	console.log('  mockflow-mcp login            Set up API key credentials');
	console.log('  mockflow-mcp --help           Show this help');
	console.log('');
	console.log('Setup:');
	console.log('  1. Run "mockflow-mcp login" to save your API key');
	console.log('  2. Run "mockflow-mcp" to start the server');
	console.log('  3. Add to your AI client:');
	console.log('');
	console.log('     Claude Code:');
	console.log('       claude mcp add mockflow-ideaboard --transport http --url http://localhost:21193/mcp');
	console.log('');
	console.log('     Cursor (Settings > MCP):');
	console.log('       { "mcpServers": { "mockflow-ideaboard": { "url": "http://localhost:21193/mcp" } } }');
	console.log('');
	console.log('     VS Code Copilot (.vscode/mcp.json):');
	console.log('       { "servers": { "mockflow-ideaboard": { "type": "http", "url": "http://localhost:21193/mcp" } } }');
	console.log('');
} else {
	// Parse --port=XXXX
	var port = 21193;
	for (var i = 0; i < args.length; i++) {
		if (args[i].indexOf('--port=') === 0) {
			port = parseInt(args[i].split('=')[1], 10);
			if (isNaN(port) || port < 1 || port > 65535) {
				console.error('Invalid port number. Must be between 1 and 65535.');
				process.exit(1);
			}
		}
	}

	require('../lib/server').start(port);
}
