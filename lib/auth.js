/**
 * MockFlow MCP - Credential Management
 *
 * Stores and retrieves API key credentials for the standalone CLI.
 * Credentials are saved in ~/.mockflow/credentials.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

var MOCKFLOW_DIR = path.join(os.homedir(), '.mockflow');
var CREDENTIALS_FILE = path.join(MOCKFLOW_DIR, 'credentials.json');

/**
 * Interactive login flow.
 * User gets API key from app.mockflow.com/mcp-apikey, then pastes it here.
 */
function login() {
	console.log('');
	console.log('MockFlow IdeaBoard MCP - Login');
	console.log('==============================');
	console.log('');
	console.log('To get your API key:');
	console.log('  1. Go to https://app.mockflow.com/mcp-apikey');
	console.log('  2. Log in to your MockFlow account');
	console.log('  3. Copy the generated API key');
	console.log('');

	// Try to open browser
	try {
		var open = require('open');
		open('https://app.mockflow.com/mcp-apikey');
		console.log('(Opening browser...)');
		console.log('');
	} catch (e) {
		// open is optional
	}

	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.question('Paste your API key: ', function(apiKey) {
		apiKey = (apiKey || '').trim();
		if (!apiKey) {
			console.log('No API key provided. Aborting.');
			rl.close();
			process.exit(1);
			return;
		}

		rl.question('Your MockFlow username (email): ', function(userid) {
			userid = (userid || '').trim();
			if (!userid) {
				console.log('No username provided. Aborting.');
				rl.close();
				process.exit(1);
				return;
			}

			rl.question('Your company/client ID (press Enter to skip): ', function(clientid) {
				clientid = (clientid || '').trim();

				saveCredentials({
					apiKey: apiKey,
					userid: userid,
					clientid: clientid || '',
					savedAt: new Date().toISOString()
				});

				console.log('');
				console.log('Credentials saved to ' + CREDENTIALS_FILE);
				console.log('');
				console.log('You can now start the MCP server:');
				console.log('  mockflow-mcp');
				console.log('');

				rl.close();
			});
		});
	});
}

/**
 * Save credentials to disk.
 */
function saveCredentials(creds) {
	if (!fs.existsSync(MOCKFLOW_DIR)) {
		fs.mkdirSync(MOCKFLOW_DIR, { recursive: true });
	}
	fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2));
	// Restrict file permissions (owner read/write only)
	try { fs.chmodSync(CREDENTIALS_FILE, 0o600); } catch (e) {}
}

/**
 * Load credentials from disk.
 * @returns {{ apiKey: string, userid: string, clientid: string } | null}
 */
function loadCredentials() {
	try {
		if (fs.existsSync(CREDENTIALS_FILE)) {
			var data = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
			if (data && data.apiKey && data.userid) {
				return data;
			}
		}
	} catch (e) {
		// Corrupted file
	}
	return null;
}

module.exports = {
	login: login,
	loadCredentials: loadCredentials,
	saveCredentials: saveCredentials
};
