#!/usr/bin/env node

/**
 * MockFlow IdeaBoard MCP - CLI Entry Point
 *
 * Commands:
 *   mockflow-ideaboard-mcp                  Start local MCP server (default port 21193)
 *   mockflow-ideaboard-mcp --port=8888      Start on custom port
 *   mockflow-ideaboard-mcp login            Set up API key credentials
 *   mockflow-ideaboard-mcp --help           Show usage
 */

var args = process.argv.slice(2);
var command = args[0];

if (command === 'login') {
	require('../lib/auth').login();
} else if (command === 'logout') {
	console.log('');
	console.log('To logout, remove your credentials file:');
	console.log('  rm ~/.mockflow/credentials.json');
	console.log('');
} else if (command === '--help' || command === '-h' || command === 'help') {
	console.log('');
	console.log('MockFlow IdeaBoard MCP - Local MCP Server');
	console.log('');
	console.log('Usage:');
	console.log('  mockflow-ideaboard-mcp                  Start local MCP server');
	console.log('  mockflow-ideaboard-mcp --port=<number>  Start on custom port (default: 21193)');
	console.log('  mockflow-ideaboard-mcp --space=<id>     Create projects in a specific design space');
	console.log('  mockflow-ideaboard-mcp login            Set up credentials');
	console.log('  mockflow-ideaboard-mcp logout           Show how to remove credentials');
	console.log('  mockflow-ideaboard-mcp --help           Show this help');
	console.log('');
	console.log('Setup:');
	console.log('  1. Run "mockflow-ideaboard-mcp login" to save your API key');
	console.log('  2. Run "mockflow-ideaboard-mcp" to start the server');
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
	// Parse flags
	var port = 21193;
	var spaceId = null;
	for (var i = 0; i < args.length; i++) {
		if (args[i].indexOf('--port=') === 0) {
			port = parseInt(args[i].split('=')[1], 10);
			if (isNaN(port) || port < 1 || port > 65535) {
				console.error('Invalid port number. Must be between 1 and 65535.');
				process.exit(1);
			}
		}
		if (args[i].indexOf('--space=') === 0) {
			spaceId = args[i].split('=')[1];
		}
	}

	require('../lib/server').start(port, { spaceId: spaceId });
}
