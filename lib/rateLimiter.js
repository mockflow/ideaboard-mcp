/**
 * Rate Limiter for MockFlow MCP Servers (authenticated users)
 *
 * Strategy: Sliding Window Counter per user
 *
 * Usage:
 *   var rl = createRateLimiter({ limit: 20, windowMs: 60000 });
 *   app.post('/mcp', rl.middleware, handler);
 *   // health endpoint: res.json({ rateLimit: rl.getLimitsInfo() })
 *
 * Headers returned on every tools/call response (IETF draft-ietf-httpapi-ratelimit-headers):
 *   RateLimit-Limit:     max visualizations allowed in the window
 *   RateLimit-Remaining: visualizations left in the current window
 *   RateLimit-Reset:     seconds until the window resets
 *   Retry-After:         (only on 429) seconds to wait before retrying
 *
 * @see https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
 */

/**
 * Create a rate limiter instance.
 *
 * @param {object} opts
 * @param {number} opts.limit      - Max tools/call requests per window (default: 20)
 * @param {number} opts.windowMs   - Window size in milliseconds (default: 60000)
 */
function createRateLimiter(opts) {
	opts = opts || {};
	var LIMIT = opts.limit || 20;
	var WINDOW_MS = opts.windowMs || 60 * 1000;
	var windowLabel = Math.round(WINDOW_MS / 1000) + 's';

	// In-memory store: key -> { timestamps: number[] }
	var store = new Map();

	// Cleanup stale entries every 5 minutes
	var cleanupTimer = setInterval(function () {
		var now = Date.now();
		for (var entry of store) {
			var key = entry[0];
			var bucket = entry[1];
			bucket.timestamps = bucket.timestamps.filter(function (t) { return t > now - WINDOW_MS; });
			if (bucket.timestamps.length === 0) {
				store.delete(key);
			}
		}
	}, 5 * 60 * 1000);
	if (cleanupTimer.unref) cleanupTimer.unref();

	/**
	 * Get rate-limit key from request. Uses userid if available, falls back to IP.
	 */
	function getKey(req) {
		if (req.user && req.user.userid) {
			return 'user:' + req.user.userid;
		}
		var forwarded = req.headers['x-forwarded-for'];
		var ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
		return 'ip:' + ip;
	}

	/**
	 * Express middleware — only counts tools/call requests (actual renders).
	 */
	function middleware(req, res, next) {
		// Only rate-limit tools/call (actual renders), not protocol handshake
		var method = req.body && req.body.method;
		if (method !== 'tools/call') {
			return next();
		}

		var now = Date.now();
		var key = getKey(req);

		// Get or create bucket
		var bucket = store.get(key);
		if (!bucket) {
			bucket = { timestamps: [] };
			store.set(key, bucket);
		}

		// Slide window
		bucket.timestamps = bucket.timestamps.filter(function (t) { return t > now - WINDOW_MS; });

		var remaining = Math.max(0, LIMIT - bucket.timestamps.length);
		var resetMs = bucket.timestamps.length > 0
			? (bucket.timestamps[0] + WINDOW_MS) - now
			: WINDOW_MS;
		var resetSeconds = Math.ceil(resetMs / 1000);

		// Always set rate-limit headers (IETF draft)
		res.setHeader('RateLimit-Limit', String(LIMIT));
		res.setHeader('RateLimit-Remaining', String(remaining));
		res.setHeader('RateLimit-Reset', String(resetSeconds));

		if (remaining <= 0) {
			// Return as a successful MCP tool result with isError: true
			// HTTP 429 causes MCP clients (Claude, etc.) to treat it as a transport
			// failure / timeout instead of showing the error message to the user.
			res.setHeader('Retry-After', String(resetSeconds));

			var resultBody = {
				jsonrpc: '2.0',
				id: (req.body && req.body.id) || null,
				result: {
					content: [
						{
							type: 'text',
							text: 'Rate limit reached: maximum ' + LIMIT + ' visualizations per ' + windowLabel + '. Please wait ' + resetSeconds + ' seconds before trying again.'
						}
					],
					isError: true
				}
			};

			res.json(resultBody);
			return;
		}

		// Warning header when approaching limit (<=20% remaining)
		if (remaining <= Math.ceil(LIMIT * 0.2)) {
			res.setHeader('X-RateLimit-Warning',
				'Approaching rate limit: ' + remaining + ' of ' + LIMIT + ' requests remaining. Resets in ' + resetSeconds + 's.');
		}

		// Record this request
		bucket.timestamps.push(now);
		res.setHeader('RateLimit-Remaining', String(Math.max(0, remaining - 1)));

		next();
	}

	/**
	 * Rate limit info for health/info endpoints.
	 */
	function getLimitsInfo() {
		return {
			limit: LIMIT,
			window: windowLabel,
			strategy: 'Sliding window counter per user',
			description: LIMIT + ' visualizations per ' + windowLabel + ' sliding window per authenticated user (only tools/call counted)',
			headers: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After (on 429)'],
			tip: 'Respect the Retry-After header and spread requests evenly across the window.'
		};
	}

	return {
		middleware: middleware,
		getLimitsInfo: getLimitsInfo
	};
}

module.exports = createRateLimiter;
