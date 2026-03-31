/**
 * MCP Protocol Handler for MockFlow IdeaBoard
 *
 * Handles MCP protocol methods:
 * - initialize: Initialize the MCP session
 * - tools/list: List available IdeaBoard tools (from registry)
 * - tools/call: Route to the appropriate handler
 *
 * Tool definitions are loaded from ideaboard-mcp-component-registry.js
 */

const { v4: uuidv4 } = require('uuid');

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_NAME = 'MockFlow IdeaBoard';
const SERVER_VERSION = '1.0.0';

class MCPHandler {
    /**
     * @param {boolean} isDev - Development mode flag
     * @param {object} options - Optional configuration
     * @param {function} options.logger - Logging function
     * @param {function} options.userProvider - Function () => { userid, clientid, scope } | null
     * @param {function} options.contextProvider - Async function () => { projectid } | null
     * @param {array} options.tools - Custom tool definitions (overrides getToolDefinitions)
     * @param {string} options.serverName - Server name override
     */
    constructor(isDev = false, options = {}) {
        this.sessions = new Map();
        this.isDev = isDev;

        this.log = options.logger || (typeof global !== 'undefined' && typeof global.logMessage === 'function' ? global.logMessage : console.log);
        this.getUserFromReq = options.userProvider || ((req) => (req && req.user) || null);
        this.contextProvider = options.contextProvider || null;
        this.customTools = options.tools || null;
        this.serverName = options.serverName || SERVER_NAME;

        this.log('MCP Handler initialized: ' + this.serverName);
    }

    /**
     * Main request router
     */
    async handleRequest(method, params, req) {
        if (method.startsWith('notifications/')) {
            this.log('MCP Notification: ' + method);
            return {};
        }

        switch (method) {
            case 'initialize':
                return this.handleInitialize(params);
            case 'initialized':
                return {};
            case 'tools/list':
                return this.handleToolsList(params);
            case 'tools/call':
                return this.handleToolsCall(params, req);
            case 'ping':
                return {};
            case 'resources/list':
                return { resources: [] };
            case 'prompts/list':
                return { prompts: [] };
            default:
                this.log('Unknown MCP method: ' + method);
                throw new Error('Method not found: ' + method);
        }
    }

    /**
     * Handle initialize method
     */
    handleInitialize(params) {
        var sessionId = uuidv4().replace(/-/g, '');
        this.sessions.set(sessionId, {
            createdAt: new Date(),
            clientInfo: params.clientInfo || {}
        });

        return {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {
                tools: { listChanged: false }
            },
            serverInfo: {
                name: this.serverName,
                version: SERVER_VERSION
            },
            instructions: 'MockFlow IdeaBoard is a visualization and diagramming tool. Use these tools whenever the user asks to create, visualize, or diagram anything — including flowcharts, mindmaps, charts, timelines (use render_gantt), architecture diagrams, kanban boards, storyboards, whiteboards, and more. Trigger on keywords like: ideaboard, mockflow, diagram, visualize, flowchart, mindmap, timeline, kanban, whiteboard, storyboard.'
        };
    }

    /**
     * Handle tools/list method
     */
    handleToolsList(params) {
        return {
            tools: this.customTools || this.getToolDefinitions()
        };
    }

    /**
     * Handle tools/call method
     * Override this in subclasses or handle externally via the MCP server
     */
    async handleToolsCall(params, req) {
        var name = params.name;
        var args = params.arguments || {};

        if (!name) {
            throw new Error('Tool name is required');
        }

        this.log('Tool call: ' + name);

        return {
            content: [{ type: 'text', text: 'Tool ' + name + ' called successfully' }],
            isError: false
        };
    }

    /**
     * Get tool definitions — override via options.tools or subclass
     */
    getToolDefinitions() {
        return [];
    }
}

module.exports = MCPHandler;
