/**
 * MockFlow MCP - OAuth Authentication
 *
 * Login flow:
 *   1. Start local HTTP server on localhost for OAuth callback
 *   2. Open browser to MockFlow OAuth authorize endpoint
 *   3. User logs in to MockFlow in browser
 *   4. Browser redirects back to localhost with auth code
 *   5. Exchange code for access token
 *   6. Validate token to get userid/clientid
 *   7. Save credentials to ~/.mockflow/credentials.json
 *
 * Same OAuth flow used by Figma, Miro, and other MCP servers.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

var MOCKFLOW_DIR = path.join(os.homedir(), '.mockflow');
var CREDENTIALS_FILE = path.join(MOCKFLOW_DIR, 'credentials.json');

var OAUTH_BASE = 'https://app.mockflow.com';
var OAUTH_AUTHORIZE = OAUTH_BASE + '/ideaboard_oauth.jsp';
var OAUTH_TOKEN = OAUTH_BASE + '/ideaboard_oauth_token';
var OAUTH_VALIDATE = OAUTH_BASE + '/ideaboard_oauth_validate';
var CLIENT_ID = 'mockflow-mcp-cli';
var CALLBACK_PORT = 18193;
var REDIRECT_URI = 'http://localhost:' + CALLBACK_PORT + '/callback';

/**
 * OAuth login flow via browser redirect.
 */
function login() {
	console.log('');
	console.log('MockFlow IdeaBoard MCP - Login');
	console.log('==============================');
	console.log('');
	console.log('Opening browser for MockFlow login...');
	console.log('');

	var state = crypto.randomBytes(16).toString('hex');

	// Start local server to receive OAuth callback
	var callbackServer = http.createServer(function(req, res) {
		var url = new URL(req.url, 'http://localhost:' + CALLBACK_PORT);

		if (url.pathname !== '/callback') {
			res.writeHead(404);
			res.end('Not found');
			return;
		}

		var code = url.searchParams.get('code');
		var returnedState = url.searchParams.get('state');
		var error = url.searchParams.get('error');

		if (error) {
			res.writeHead(200, { 'Content-Type': 'text/html' });
			res.end('<html><body><h2>Login Failed</h2><p>' + error + '</p><p>You can close this window.</p></body></html>');
			console.log('Login failed: ' + error);
			callbackServer.close();
			process.exit(1);
			return;
		}

		if (!code) {
			res.writeHead(400, { 'Content-Type': 'text/html' });
			res.end('<html><body><h2>Error</h2><p>No authorization code received.</p></body></html>');
			callbackServer.close();
			process.exit(1);
			return;
		}

		if (returnedState !== state) {
			res.writeHead(400, { 'Content-Type': 'text/html' });
			res.end('<html><body><h2>Error</h2><p>State mismatch. Please try again.</p></body></html>');
			callbackServer.close();
			process.exit(1);
			return;
		}

		console.log('Authorization code received. Exchanging for token...');

		// Exchange code for token
		exchangeCodeForToken(code, function(err, tokenData) {
			if (err) {
				res.writeHead(200, { 'Content-Type': 'text/html' });
				res.end('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>Login Failed</h2><p>' + err.message + '</p></body></html>');
				console.log('');
				console.log('Error exchanging code for token: ' + err.message);
				callbackServer.close();
				process.exit(1);
				return;
			}

			console.log('Token received. Validating...');

			if (!tokenData || !tokenData.access_token) {
				console.log('Token response:', JSON.stringify(tokenData));
				res.writeHead(200, { 'Content-Type': 'text/html' });
				res.end('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>Login Failed</h2><p>No access token received.</p></body></html>');
				callbackServer.close();
				process.exit(1);
				return;
			}

			// Validate token to get user info
			validateToken(tokenData.access_token, function(err2, userInfo) {
				if (err2) {
					console.log('Token validation error:', err2.message);
				}

				var creds = {
					access_token: tokenData.access_token,
					refresh_token: tokenData.refresh_token || '',
					userid: userInfo ? userInfo.userid : '',
					clientid: userInfo ? userInfo.clientid : '',
					scope: userInfo ? userInfo.scope : 'read write',
					savedAt: new Date().toISOString()
				};

				saveCredentials(creds);

				var displayName = creds.userid || 'unknown';

				res.writeHead(200, { 'Content-Type': 'text/html' });
				res.end('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>Login Successful!</h2><p>Logged in as ' + displayName + '. You can close this window.</p></body></html>');

				console.log('');
				console.log('Logged in as: ' + displayName);
				console.log('Credentials saved to ' + CREDENTIALS_FILE);
				console.log('');
				console.log('You can now start the MCP server:');
				console.log('  mockflow-mcp');
				console.log('');

				callbackServer.close();
				process.exit(0);
			});
		});
	});

	callbackServer.listen(CALLBACK_PORT, '127.0.0.1', function() {
		// Build authorize URL
		var params = new URLSearchParams({
			client_id: CLIENT_ID,
			redirect_uri: REDIRECT_URI,
			response_type: 'code',
			state: state,
			scope: 'read write'
		});

		var authorizeUrl = OAUTH_AUTHORIZE + '?' + params.toString();

		// Open browser (use child_process for cross-platform, no dependency needed)
		try {
			var exec = require('child_process').exec;
			if (process.platform === 'darwin') {
				exec('open "' + authorizeUrl + '"');
			} else if (process.platform === 'win32') {
				exec('start "" "' + authorizeUrl + '"');
			} else {
				exec('xdg-open "' + authorizeUrl + '"');
			}
			console.log('If the browser didn\'t open, visit this URL manually:');
		} catch (e) {
			console.log('Open this URL in your browser:');
		}
		console.log('');
		console.log('  ' + authorizeUrl);
		console.log('');
		console.log('Waiting for login...');
	});

	callbackServer.on('error', function(err) {
		if (err.code === 'EADDRINUSE') {
			console.log('Port ' + CALLBACK_PORT + ' is in use. Close any running mockflow-mcp login and try again.');
		} else {
			console.log('Failed to start login server: ' + err.message);
		}
		process.exit(1);
	});

	// Timeout after 5 minutes
	setTimeout(function() {
		console.log('');
		console.log('Login timed out. Please try again.');
		callbackServer.close();
		process.exit(1);
	}, 5 * 60 * 1000);
}

/**
 * Exchange authorization code for access token.
 */
function exchangeCodeForToken(code, callback) {
	var postData = new URLSearchParams({
		grant_type: 'authorization_code',
		code: code,
		redirect_uri: REDIRECT_URI,
		client_id: CLIENT_ID
	}).toString();

	var url = new URL(OAUTH_TOKEN);

	var options = {
		hostname: url.hostname,
		port: url.port || 443,
		path: url.pathname,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(postData)
		}
	};

	var protocol = url.protocol === 'https:' ? require('https') : require('http');

	var req = protocol.request(options, function(res) {
		var body = '';
		res.on('data', function(chunk) { body += chunk; });
		res.on('end', function() {
			console.log('Token endpoint response (status ' + res.statusCode + '):', body.substring(0, 500));
			try {
				var data = JSON.parse(body);
				if (data.error) {
					callback(new Error(data.error_description || data.error));
				} else {
					callback(null, data);
				}
			} catch (e) {
				callback(new Error('Invalid token response: ' + body.substring(0, 200)));
			}
		});
	});

	req.on('error', function(err) { callback(err); });
	req.write(postData);
	req.end();
}

/**
 * Validate access token and get user info.
 */
function validateToken(accessToken, callback) {
	var postData = JSON.stringify({ access_token: accessToken });

	var url = new URL(OAUTH_VALIDATE);

	var options = {
		hostname: url.hostname,
		port: url.port || 443,
		path: url.pathname,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(postData)
		}
	};

	var protocol = url.protocol === 'https:' ? require('https') : require('http');

	var req = protocol.request(options, function(res) {
		var body = '';
		res.on('data', function(chunk) { body += chunk; });
		res.on('end', function() {
			try {
				var data = JSON.parse(body);
				if (data.valid) {
					callback(null, { userid: data.userid, clientid: data.clientid, scope: data.scope });
				} else {
					callback(null, null);
				}
			} catch (e) {
				callback(null, null);
			}
		});
	});

	req.on('error', function() { callback(null, null); });
	req.write(postData);
	req.end();
}

/**
 * Save credentials to disk.
 */
function saveCredentials(creds) {
	if (!fs.existsSync(MOCKFLOW_DIR)) {
		fs.mkdirSync(MOCKFLOW_DIR, { recursive: true });
	}
	fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2));
	try { fs.chmodSync(CREDENTIALS_FILE, 0o600); } catch (e) {}
}

/**
 * Load credentials from disk.
 * @returns {{ access_token: string, userid: string, clientid: string } | null}
 */
function loadCredentials() {
	try {
		if (fs.existsSync(CREDENTIALS_FILE)) {
			var data = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
			if (data && (data.access_token || data.apiKey) && data.userid) {
				return data;
			}
		}
	} catch (e) {}
	return null;
}

module.exports = {
	login: login,
	loadCredentials: loadCredentials,
	saveCredentials: saveCredentials
};
