/**
 * MCP Handler for MockFlow IdeaBoard
 *
 * Handles MCP protocol methods:
 * - initialize: Initialize the MCP session
 * - tools/list: List available IdeaBoard tools
 * - tools/call: Execute a tool (render visualization)
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_NAME = 'MockFlow IdeaBoard';
const SERVER_VERSION = '1.0.0';

class MCPHandler {
    /**
     * @param {boolean} isDev - Development mode flag
     * @param {object} options - Optional configuration for portability
     * @param {function} options.logger - Logging function (defaults to global.logMessage or console.log)
     * @param {function} options.userProvider - Function (req) => { userid, clientid, scope } | null
     * @param {function} options.contextProvider - Async function () => { projectid } | null (e.g. active board in desktop app)
     */
    constructor(isDev = false, options = {}) {
        this.sessions = new Map();
        this.isDev = isDev;

        // Injectable logger for portability (remote server sets global.logMessage, local servers pass their own)
        this.log = options.logger || (typeof global !== 'undefined' && typeof global.logMessage === 'function' ? global.logMessage : console.log);

        // Injectable user provider (remote server uses req.user from OAuth middleware, local servers inject directly)
        this.getUserFromReq = options.userProvider || ((req) => (req && req.user) || null);

        // Injectable context provider for active board detection (desktop app only)
        this.contextProvider = options.contextProvider || null;

        // Backend URL for rendering (Java servlet endpoint)
        this.renderBackendUrl = isDev
            ? 'http://localhost:8080/MockFlow-WireframePro'
            : 'https://app.mockflow.com';

        // Base URL for this MCP server (used for widget URLs)
        this.baseUrl = isDev
            ? 'http://localhost:3001'
            : 'https://app.mockflow.com';

        this.log(`MCP Handler using backend: ${this.renderBackendUrl}`);
    }

    /**
     * Main request router
     */
    async handleRequest(method, params, req) {
        // Handle notifications (no response required)
        if (method.startsWith('notifications/')) {
            this.log(`MCP Notification: ${method}`);
            return {};
        }

        switch (method) {
            case 'initialize':
                return this.handleInitialize(params, req);

            case 'initialized':
                // Notification - acknowledge
                return {};

            case 'tools/list':
                return this.handleToolsList(params);

            case 'tools/call':
                return this.handleToolsCall(params, req);

            case 'ping':
                return {};

            case 'resources/list':
                // Return UI widget resources for ChatGPT Apps SDK
                console.log('[MCP] resources/list called - returning widget resource');
                return {
                    resources: [
                        {
                            uri: 'ui://ideaboard/preview-widget.html',
                            name: 'IdeaBoard Preview Widget',
                            description: 'UI widget for displaying IdeaBoard visualization previews',
                            mimeType: 'text/html+skybridge',
                            _meta: {
                                'openai/outputTemplate': 'ui://ideaboard/preview-widget.html',
                                'openai/widgetAccessible': true
                            }
                        }
                    ]
                };

            case 'resources/read':
                // Return the UI widget HTML for ChatGPT Apps SDK
                console.log('[MCP] resources/read called with params:', JSON.stringify(params));
                return this.handleResourcesRead(params);

            case 'prompts/list':
                // We don't have prompts, return empty
                return { prompts: [] };

            default:
                this.log(`Unknown MCP method: ${method}`);
                throw new Error(`Method not found: ${method}`);
        }
    }

    /**
     * Handle initialize method
     */
    handleInitialize(params, req) {
        const sessionId = uuidv4().replace(/-/g, '');
        this.sessions.set(sessionId, {
            createdAt: new Date(),
            clientInfo: params.clientInfo || {}
        });

        // Determine base URL for OAuth endpoints
        const baseUrl = this.isDev
            ? 'http://localhost:3001'
            : 'https://app.mockflow.com';

        return {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {
                tools: {
                    listChanged: false
                },
                // Advertise resources capability for ChatGPT Apps SDK UI widgets
                resources: {
                    subscribe: false,
                    listChanged: false
                },
                authentication: {
                    schemes: ['oauth']
                }
            },
            serverInfo: {
                name: SERVER_NAME,
                version: SERVER_VERSION
            },
            // OAuth configuration for Claude to discover
            oauth: {
                authorizationUrl: `${baseUrl}/ideaboard/oauth/authorize`,
                tokenUrl: `${baseUrl}/ideaboard/oauth/token`,
                clientId: 'claude-ideaboard',
                scopes: ['read', 'write']
            }
        };
    }

    /**
     * Handle tools/list method
     */
    handleToolsList(params) {
        return {
            tools: this.getToolDefinitions()
        };
    }

    /**
     * Handle tools/call method
     */
    async handleToolsCall(params, req) {
        const { name, arguments: args } = params;

        this.log('tools/call params:', JSON.stringify(params, null, 2));

        if (!name) {
            throw new Error('Tool name is required');
        }

        // Map tool name to action type
        const actionType = name.replace('render_', '');
        this.log(`Tool: ${name}, ActionType: ${actionType}`);
        this.log('Arguments:', JSON.stringify(args, null, 2));

        // Get user context from OAuth or injected provider (desktop/CLI)
        const user = this.getUserFromReq(req);
        if (user) {
            this.log(`Authenticated user: ${user.userid}`);
        } else {
            this.log('Anonymous request (no OAuth token)');
        }

        // Get active board context if available (desktop app: saves to open board)
        let boardContext = null;
        if (this.contextProvider) {
            try {
                boardContext = await this.contextProvider();
            } catch (e) {
                this.log('Context provider error:', e.message);
            }
        }

        try {
            // Call the backend render endpoint with user context
            const result = await this.callRenderBackend(actionType, args || {}, user, boardContext);
            this.log('Tool result:', JSON.stringify(result).substring(0, 300));
            return result;
        } catch (error) {
            this.log(`Tool call error for ${name}:`, error.message);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error creating ${actionType}: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    }

    /**
     * Call the backend render endpoint
     * @param {string} actionType - The type of visualization to render
     * @param {object} args - Tool arguments
     * @param {object|null} user - Authenticated user context (null for anonymous)
     * @param {object|null} boardContext - Active board context from desktop app (null if no board open)
     */
    async callRenderBackend(actionType, args, user = null, boardContext = null) {
        const endpoint = `${this.renderBackendUrl}/integrations/gptaction/render_${actionType}`;
        this.log(`Calling backend: ${endpoint}`);

        // Build request payload with optional user context
        const payload = {
            ...args
        };

        // Add user context if authenticated
        if (user) {
            payload._oauth = {
                userid: user.userid,
                clientid: user.clientid,
                scope: user.scope
            };
        }

        // Add active board context if available (desktop app: save to open board)
        if (boardContext && boardContext.projectid) {
            payload._boardContext = {
                projectid: boardContext.projectid,
                title: boardContext.title || '',
                company: boardContext.company || ''
            };
            this.log(`Saving to active board: ${boardContext.projectid}`);
        }

        try {
            const response = await axios.post(endpoint, payload, {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                timeout: 60000 // 60 second timeout
            });

            const data = response.data;
            this.log('Backend response:', JSON.stringify(data).substring(0, 200));

            if (data.success) {
                // Return URL prominently - Claude must display this to user
                // Also include structuredContent and _meta for ChatGPT Apps SDK
                const toolResult = {
                    // Standard MCP content - works for all clients (Claude, etc.)
                    content: [
                        {
                            type: 'text',
                            text: `URL: ${data.url}`
                        },
                        {
                            type: 'text',
                            text: `Thumbnail: ${data.thumbnailUrl}`
                        }
                    ],
                    // Structured content for ChatGPT model + widget consumption
                    structuredContent: {
                        url: data.url,
                        thumbnailUrl: data.thumbnailUrl,
                        actionType: actionType,
                        title: this.getActionTitle(actionType),
                        success: true
                    },
                    // Metadata for ChatGPT UI widget (not exposed to model)
                    _meta: {
                        'openai/outputTemplate': 'ui://ideaboard/preview-widget.html',
                        'openai/widgetAccessible': true
                    },
                    isError: false
                };
                console.log('[MCP] Tool result:', JSON.stringify(toolResult, null, 2));
                return toolResult;
            } else {
                throw new Error(data.error || 'Backend returned failure');
            }
        } catch (error) {
            this.log('Backend call error:', error.message);
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Backend not running. Start Tomcat on localhost:8080');
            }
            if (error.response) {
                this.log('Backend response:', error.response.status, error.response.data);
                throw new Error(`Backend error: ${error.response.status}`);
            }
            throw error;
        }
    }

    /**
     * Get all tool definitions
     */
    getToolDefinitions() {
        // Widget URI for ChatGPT Apps SDK (uses ui:// protocol for MCP resource)
        const widgetUrl = 'ui://ideaboard/preview-widget.html';

        // Helper to create _meta for ChatGPT Apps SDK (matching official examples)
        const createToolMeta = (title) => ({
            'openai/outputTemplate': widgetUrl,
            'openai/toolInvocation/invoking': `Creating ${title}...`,
            'openai/toolInvocation/invoked': `${title} created`,
            'openai/widgetAccessible': true
        });

        // Output schema for structuredContent (required for ChatGPT to pass data to widget)
        const outputSchema = {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to the created visualization' },
                thumbnailUrl: { type: 'string', description: 'URL to the thumbnail image' },
                actionType: { type: 'string', description: 'Type of visualization created' },
                title: { type: 'string', description: 'Human-readable title' },
                success: { type: 'boolean', description: 'Whether creation was successful' }
            },
            required: ['url', 'thumbnailUrl', 'actionType', 'title', 'success']
        };

        return [
            {
                name: 'render_flowchart',
                title: 'Create Diagram (Flowchart, Bio, Circuit, P&ID, UML, Web/Mobile Layout, Sketchy, 3D)',  // Top-level title (required by Apps SDK)
                description: `Create diagrams including: Flowcharts, Sketchy Diagrams, 3D Isometric Diagrams, Bio/Medical Diagrams, Circuit Diagrams, P&ID Diagrams, UML Diagrams, Sketchy UML, Cloud Isometric Diagrams, Web Layout Diagrams, and Mobile Layout Diagrams.

CATEGORY (CRITICAL) - You MUST include a "category" field:
- "default": General flowcharts, business processes, software flows. Uses standard shapes - NO matchKey needed
- "sketchy": Hand-drawn style diagrams when user mentions "sketchy diagram", "hand-drawn diagram". Uses same shapes as default - NO matchKey needed
- "3d": 3D/isometric diagrams when user mentions "3D diagram", "3D isometric diagram", "isometric diagram". Uses same shapes as default - NO matchKey needed
- "bio": Biological, medical, anatomical diagrams (digestive system, cell cycle, DNA). Include matchKey in nodes
- "circuit": Electrical, electronic, circuit diagrams. Include matchKey in nodes
- "pandid": Piping and instrumentation diagrams (P&ID). Include matchKey in nodes
- "uml": UML diagrams (class, sequence, use case, activity). Include matchKey in nodes
- "uml-sketchy": Hand-drawn style UML diagrams. Include matchKey in nodes
- "cloud-isometric": Isometric cloud diagrams. Include matchKey in nodes
- "weblayout": Web layout diagrams, web page structure. Include matchKey in nodes
- "mobilelayout": Mobile layout diagrams, mobile app structure. Include matchKey in nodes

LAYOUT RULES:
- Vertical top-to-bottom layout with 100-120px spacing between levels
- Branches from decisions placed side-by-side horizontally (100-200px apart)
- No two nodes should have same "loc" coordinates
- Links must not cross over nodes

NODE PROPERTIES:
- key: Unique integer ID
- text: Label text
- color: Pastel colors (#bae6fd light blue, #bbf7d0 light green, #fbcfe8 pink, #fde68a yellow, #ddd6fe purple, #a7f3d0 mint)
- loc: Position as "x y" string (e.g., "300 100")
- width: 140, height: 60
- shape: "Circle" (start/end), "Diamond" (decision), "RoundedRectangle" (process), "Rectangle" (step)
- matchKey: (ONLY for bio, circuit, pandid, uml, uml-sketchy, cloud-isometric, weblayout, mobilelayout) Single lowercase keyword for icon matching

matchKey EXAMPLES (for specialized categories):
- Bio: "Small Intestine" → matchKey: "intestine", "Stomach" → matchKey: "stomach"
- Circuit: "10k Resistor" → matchKey: "resistor", "Op-Amp" → matchKey: "opamp"
- P&ID: "Ball Valve" → matchKey: "valve", "Centrifugal Pump" → matchKey: "pump"
- UML: "Class" → matchKey: "class", "Interface" → matchKey: "interface"
- Web Layout: "Header" → matchKey: "header", "Navigation" → matchKey: "navigation"
- Mobile Layout: "App Bar" → matchKey: "appbar", "Tab Bar" → matchKey: "tabbar"

LINK PROPERTIES (CRITICAL):
- Every node must be connected - no orphan nodes!
- from/to: Node keys to connect
- fromSpot/toSpot: "Bottom", "Top", "Left", "Right" for clean routing
- text: Labels for decision branches ("Yes", "No", "If true", "If failed")
- segmentFraction: 0.1-0.9 for label placement along line

STRUCTURE:
- diagramType: "flowchart"
- class: "GraphLinksModel"
- category: One of the categories above (REQUIRED)
- Start with a Circle node at top
- End with a Circle node at bottom
- Use Diamond for decisions
- Use RoundedRectangle for processes

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: createToolMeta('Diagram'),
                outputSchema: outputSchema,
                inputSchema: {
                    type: 'object',
                    properties: {
                        diagramType: {
                            type: 'string',
                            enum: ['flowchart'],
                            description: "Must be 'flowchart'"
                        },
                        class: {
                            type: 'string',
                            description: "GoJS model class, typically 'GraphLinksModel'"
                        },
                        category: {
                            type: 'string',
                            enum: ['default', 'sketchy', '3d', 'bio', 'circuit', 'pandid', 'uml', 'uml-sketchy', 'cloud-isometric', 'weblayout', 'mobilelayout'],
                            default: 'default',
                            description: "Diagram category (optional, defaults to 'default'). Use 'default', 'sketchy', or '3d' for standard shapes. Use specialized categories (bio, circuit, pandid, uml, etc.) for icon matching with matchKey."
                        },
                        nodeDataArray: {
                            type: 'array',
                            description: 'Array of nodes with key, text, color, loc, width, height, shape, and optionally matchKey properties',
                            items: {
                                type: 'object',
                                properties: {
                                    key: { type: 'integer' },
                                    text: { type: 'string' },
                                    color: { type: 'string', description: 'Pastel color like #bae6fd, #bbf7d0' },
                                    loc: { type: 'string', description: 'Position as "x y" string' },
                                    width: { type: 'number', default: 140 },
                                    height: { type: 'number', default: 60 },
                                    shape: { type: 'string', enum: ['Circle', 'RoundedRectangle', 'Diamond', 'Rectangle'] },
                                    matchKey: { type: 'string', description: 'Single lowercase keyword for icon matching (only for bio, circuit, pandid, uml, uml-sketchy, cloud-isometric, weblayout, mobilelayout categories)' }
                                }
                            }
                        },
                        linkDataArray: {
                            type: 'array',
                            description: 'Array of links connecting nodes',
                            items: {
                                type: 'object',
                                properties: {
                                    from: { type: 'integer' },
                                    to: { type: 'integer' },
                                    fromSpot: { type: 'string', enum: ['Top', 'Bottom', 'Left', 'Right'] },
                                    toSpot: { type: 'string', enum: ['Top', 'Bottom', 'Left', 'Right'] },
                                    text: { type: 'string', description: 'Link label like "Yes", "No"' },
                                    segmentFraction: { type: 'number', description: '0.1-0.9 for label position' }
                                }
                            }
                        }
                    },
                    required: ['diagramType', 'class', 'nodeDataArray', 'linkDataArray']
                }
            },
            {
                name: 'render_mindmap',
                title: 'Create Mind Map',
                description: `Create a mindmap for brainstorming, topic exploration, and hierarchical idea organization.

STRUCTURE RULES:
- Root node has "root": true
- Each node needs unique "id" (string)
- Use "topic" for node text (can include emojis)
- "direction": 0 = left side, 1 = right side
- Balance branches between left and right
- Use "children" array for sub-nodes (empty array if none)

CONTENT GUIDELINES:
- 2-4 main branches with 1-3 sub-levels each
- Include relevant emojis in topic text for visual appeal
- Clear, concise topic names

EXAMPLE STRUCTURE:
{
  "nodeData": {
    "id": "root",
    "topic": "Main Topic",
    "root": true,
    "children": [
      { "id": "left1", "topic": "🎯 Left Branch", "direction": 0, "children": [
        { "id": "sub1", "topic": "Sub-topic A" }
      ]},
      { "id": "right1", "topic": "💡 Right Branch", "direction": 1, "children": [] }
    ]
  }
}

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: createToolMeta('Mind Map'),
                outputSchema: outputSchema,
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeData: {
                            type: 'object',
                            description: 'Root node with id, topic, root=true, and children array. Children have direction (0=left, 1=right)',
                            properties: {
                                id: { type: 'string' },
                                topic: { type: 'string' },
                                root: { type: 'boolean' },
                                children: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            topic: { type: 'string' },
                                            direction: { type: 'integer', enum: [0, 1], description: '0=left, 1=right' },
                                            children: {
                                                type: 'array',
                                                items: { type: 'object' },
                                                description: 'Nested children nodes'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    required: ['nodeData']
                }
            },
            {
                name: 'render_cloudarchitecture',
                title: 'Create Cloud Architecture Diagram',
                description: `Create cloud architecture diagrams for AWS, Azure, GCP, or network infrastructure.

CRITICAL FORMAT RULES:
- diagramType: "aws", "azure", "gcloud", or "cisco"
- Standard node size: width=180, height=100
- Use "\\n" for multi-line text labels (e.g., "Application\\nLoad Balancer")

CONTAINER SIZING FORMULA:
- Subnet: For N nodes vertically: width=350, height=(N × 180) + 140
- VPC: width=(numSubnets × 420) + 40, height=tallestSubnet + 90
- Cloud: VPC width + 100, VPC height + 130

SPACING RULES (for clean link labels):
- Horizontal between nodes: 320-420px center-to-center
- Vertical between nodes: 180px center-to-center
- Subnet internal padding: 85px from left, 80px from top
- First node in subnet: loc.x = subnet.loc.x + 85, loc.y = subnet.loc.y + 120

CLOUD COLORS:
- AWS: Cloud #FF9900/#FFF3E0, VPC #232F3E/#F5F5F5, Public #3F8624/#E8F5E8, Private #D13212/#FFEBEE, Data #3B48CC/#E3F2FD
- Azure: Cloud #0078D4/#E3F2FD, VNet #004578/#F0F8FF, Public #107C10/#F0FFF0, Private #D13438/#FFF0F0
- GCP: Cloud #4285F4/#E8F0FE, VPC #34A853/#E6F4EA, Public #FBBC04/#FEF7E0, Private #EA4335/#FCE8E6

STRUCTURE:
- External users node outside cloud group
- Cloud group contains VPC
- VPC contains subnets (Public, Private, Data)
- Subnets contain actual services
- Links connect services with fromSpot/toSpot for clean routing

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: createToolMeta('Cloud Architecture'),
                inputSchema: {
                    type: 'object',
                    properties: {
                        diagramType: {
                            type: 'string',
                            enum: ['aws', 'azure', 'gcloud', 'cisco'],
                            description: 'Cloud provider type'
                        },
                        class: {
                            type: 'string',
                            description: "GoJS model class, typically 'GraphLinksModel'"
                        },
                        nodeDataArray: {
                            type: 'array',
                            items: { type: 'object' },
                            description: 'Cloud components and groups. Each node: key (string), text, type, color, fillColor (for groups), loc ("x y"), width, height, shape, isGroup (true for containers), group (parent group key)'
                        },
                        linkDataArray: {
                            type: 'array',
                            items: { type: 'object' },
                            description: 'Connections: from, to (node keys), fromSpot/toSpot ("Top"/"Bottom"/"Left"/"Right"), text (label like "HTTPS", "SQL")'
                        }
                    },
                    required: ['diagramType', 'nodeDataArray']
                }
            },
            {
                name: 'render_chart',
                title: 'Create Chart',
                description: `Create charts including pie, bar, line, area, scatter, bubble, and radar charts.

CHART TYPES & DATA FORMATS:

| Type | componentType | Data Format |
|------|---------------|-------------|
| Pie | MF_PieChart2 | "Label1,Label2\\n20,30" |
| Line | MF_HorizontalLineChart | "Legends,Series\\nJan,100\\nFeb,120" |
| Vertical Bar | MF_VerticalBarChart | "Legends,Q1,Q2\\nProduct A,45,50" |
| Horizontal Bar | MF_HorizontalBarChart | Same as vertical |
| Area | MF_AreaChart | Same as line |
| Scatter | MF_ScatterChart | "Label,X,Y\\nPoint1,14,125" |
| Bubble | MF_BubbleChart | "Labels,x,y,r\\nPlot1,14,125,4" |
| Radar | MF_RadarChart | "Legends,Axis1,Axis2\\nSeries,8,9" |

DATA FORMAT RULES:
- Use CSV format with \\n for newlines
- First row contains labels/legends
- Subsequent rows contain data values
- For multi-series charts, first column is category, other columns are series

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    title: 'Create Chart',
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: {
                    'openai/outputTemplate': widgetUrl
                },
                inputSchema: {
                    type: 'object',
                    properties: {
                        componentType: {
                            type: 'string',
                            enum: ['MF_PieChart2', 'MF_HorizontalLineChart', 'MF_VerticalBarChart', 'MF_HorizontalBarChart', 'MF_AreaChart', 'MF_ScatterChart', 'MF_BubbleChart', 'MF_RadarChart'],
                            description: 'Chart type'
                        },
                        chartData: {
                            type: 'string',
                            description: 'CSV-formatted chart data. For pie: "Label1,Label2\\n20,30". For line/bar: "Legends,Series\\nJan,100\\nFeb,120"'
                        },
                        title: {
                            type: 'string',
                            description: 'Chart title'
                        }
                    },
                    required: ['componentType', 'chartData', 'title']
                }
            },
            {
                name: 'render_table',
                description: `Create data tables and grids from CSV-formatted data.

FORMAT RULES:
- First row = headers (column names)
- Data rows follow, separated by \\n
- Values separated by commas
- Wrap values containing commas in double quotes
- 5-15 data rows typical

EXAMPLE:
"Name,Email,Phone\\nJohn Doe,john@example.com,555-1234\\nJane Smith,jane@example.com,555-5678"

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    title: 'Create Table',
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: {
                    'openai/outputTemplate': widgetUrl
                },
                inputSchema: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'string',
                            description: 'CSV-formatted data. First row is headers, subsequent rows are data. Example: "Name,Email,Phone\\nJohn,john@email.com,555-1234"'
                        }
                    },
                    required: ['data']
                }
            },
            {
                name: 'render_markdown',
                title: 'Create Markdown Document',
                description: `Create markdown documents with headings, paragraphs, lists, and AI-generated images.

MARKDOWN FORMAT:
- Use standard markdown syntax
- Headings: # H1, ## H2, ### H3
- Text: **bold**, *italic*, ~~strikethrough~~
- Lists: - bullet or 1. numbered
- Links: [text](url)
- Code: \`inline\` or \`\`\`code blocks\`\`\`
- Blockquotes: > quote
- Horizontal rules: ---

AI-GENERATED IMAGES:
When the document would benefit from visual aids, include image tags with descriptive prompts:
![alt text](prompt:: "Create a detailed [description of what should be shown]")

IMAGE PROMPT RULES:
- Do NOT generate images containing text, labels, captions, words, letters, or numbers
- Only describe visuals, objects, scenes, or diagrams
- Place images contextually where they would be most relevant

EXAMPLE:
"# Document Title

Introduction paragraph with **bold** and *italic* text.

## Section 1

This section covers important topics:
- Bullet point 1
- Bullet point 2

![Diagram](prompt:: \\"Create a detailed illustration of the concept\\")

### Subsection

More detailed content here with a [link](https://example.com)."

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    title: 'Create Markdown Document',
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: createToolMeta('Markdown Document'),
                outputSchema: outputSchema,
                inputSchema: {
                    type: 'object',
                    properties: {
                        content: {
                            type: 'string',
                            description: 'Markdown content. Use standard markdown syntax. For AI-generated images, use: ![alt](prompt:: "description")'
                        }
                    },
                    required: ['content']
                }
            },
            {
                name: 'render_map',
                description: `Create maps with location markers for visualizing geographical data.

MARKER PROPERTIES:
- location: Specific location name (city, state/country)
- description: Brief description of the location
- emoji: One consistent emoji for ALL markers (e.g., "📍", "🏢", "🏭")
- geo: { coordinates: [longitude, latitude], name: "Full location name" }

CRITICAL COORDINATE RULE:
- coordinates: [LONGITUDE, LATITUDE] - longitude comes FIRST!
- Example: New York is [-74.0060, 40.7128] (not [40.7128, -74.0060])

GUIDELINES:
- Use specific location names (city, state/country)
- 3-8 locations typical
- Use the SAME emoji for all markers in a map

EXAMPLE:
{
  "markers": [
    {
      "location": "New York, NY",
      "description": "Headquarters",
      "emoji": "🏢",
      "geo": { "coordinates": [-74.0060, 40.7128], "name": "New York, NY, USA" }
    }
  ]
}

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    title: 'Create Map',
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: {
                    'openai/outputTemplate': widgetUrl
                },
                inputSchema: {
                    type: 'object',
                    properties: {
                        markers: {
                            type: 'array',
                            description: 'Array of location markers',
                            items: {
                                type: 'object',
                                properties: {
                                    location: { type: 'string', description: 'Location name like "New York, NY"' },
                                    description: { type: 'string' },
                                    emoji: { type: 'string', description: 'Single emoji for marker - use same emoji for all markers' },
                                    geo: {
                                        type: 'object',
                                        properties: {
                                            coordinates: { type: 'array', items: { type: 'number' }, description: '[longitude, latitude] - LONGITUDE FIRST!' },
                                            name: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    required: ['markers']
                }
            },
            {
                name: 'render_spreadsheet',
                description: `Create spreadsheets with cell data, formulas, and formatting.

STRUCTURE:
- cellData: JSON string with ALL cells (A1, B1, A2, B2...)
- formulas: JSON string listing cells that contain formulas
- formatting: JSON string for bold headers
- rows: Total number of rows
- cols: Total number of columns

FORMULA RULES:
- Formulas start with = (e.g., "=B2*C2", "=SUM(D2:D3)")
- Supported: SUM, AVERAGE, MAX, MIN, COUNT, IF, ROUND
- Row 1 = headers (make bold in formatting)

EXAMPLE:
{
  "cellData": "{\\"A1\\":\\"Product\\",\\"B1\\":\\"Price\\",\\"C1\\":\\"Qty\\",\\"D1\\":\\"Total\\",\\"A2\\":\\"Widget A\\",\\"B2\\":\\"25\\",\\"C2\\":\\"10\\",\\"D2\\":\\"=B2*C2\\",\\"A3\\":\\"Total\\",\\"D3\\":\\"=SUM(D2:D2)\\"}",
  "formulas": "{\\"D2\\":\\"=B2*C2\\",\\"D3\\":\\"=SUM(D2:D2)\\"}",
  "rows": 3,
  "cols": 4,
  "formatting": "{\\"A1\\":{\\"fontWeight\\":\\"bold\\"},\\"B1\\":{\\"fontWeight\\":\\"bold\\"},\\"C1\\":{\\"fontWeight\\":\\"bold\\"},\\"D1\\":{\\"fontWeight\\":\\"bold\\"}}"
}

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    title: 'Create Spreadsheet',
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: {
                    'openai/outputTemplate': widgetUrl
                },
                inputSchema: {
                    type: 'object',
                    properties: {
                        cellData: {
                            type: 'string',
                            description: 'JSON string of all cell values keyed by A1, B1, etc. Include formulas in cells that need them.'
                        },
                        formulas: {
                            type: 'string',
                            description: 'JSON string listing cells that contain formulas (e.g., {"D2":"=B2*C2"})'
                        },
                        rows: { type: 'integer', description: 'Total number of rows' },
                        cols: { type: 'integer', description: 'Total number of columns' },
                        formatting: {
                            type: 'string',
                            description: 'JSON string for cell formatting. Use {"A1":{"fontWeight":"bold"}} for headers.'
                        }
                    },
                    required: ['cellData', 'rows', 'cols']
                }
            },
            {
                name: 'render_whiteboard',
                description: `Create whiteboards with sticky notes and sections for freeform brainstorming.

STRUCTURE: { "components": { "c": [...] } }

REQUIRED PROPERTIES FOR ALL COMPONENTS:
- t: Component type
- x, y: Position
- w, h: Dimensions
- a: Angle (always 0)
- e: Unique element ID
- an: false
- hd: false
- ij: ""
- fnt: "sourcesanspro"

COMPONENT TYPES:

1. MF_Section (Container areas):
{
  t: "MF_Section", x: 50, y: 50, w: 500, h: 300, a: 0, e: "section1", an: false, hd: false, ij: "",
  tx: "Section Title", ta: "center", fs: 18, fcl: "#333333", fw: "bold", fst: "normal", td: "none", fnt: "sourcesanspro",
  fc: ["#f0f8ff", "#f0f8ff"], ft: "solid", fa: 0.2,
  bc: ["#ccc", "#ccc", "#ccc", "#ccc", "#ccc"], bw: [2, 2, 2, 2, 2], bt: ["solid", "solid", "solid", "solid", "solid"],
  br: [10, 10, 10, 10, 10], bs: true, lt: "minimal", skt: "none", skd: 20
}
Section colors (light pastels): #f0f8ff, #f5f5dc, #f0fff0, #fff8dc

2. MF_Note2 (Sticky notes):
{
  t: "MF_Note2", x: 100, y: 120, w: 150, h: 100, a: 0, e: "note1", an: false, hd: false, ij: "",
  tx: "Note text", ta: "left", fs: 14, fcl: "#333333", fw: "normal", fst: "normal", td: "none", fnt: "sourcesanspro",
  lh: 1.3, tp: 10, fc: ["#fbf4a4", "#fbf4a4"], ft: "solid", fa: 1,
  st: "custom::0::2::2::0::#000000::0.1", borderColor: "#000000", bw: 1, bt: "none", br: 5, fd: true
}
Sticky note colors: #fbf4a4 (yellow), #d3f293 (green), #A7CDF6 (blue), #f0b6bc (pink), #e6defd (purple)

3. MF_Text (Labels and headers):
{
  t: "MF_Text", x: 100, y: 50, w: 200, h: 30, a: 0, e: "text1", an: false, hd: false, ij: "",
  tx: "Header Text", ta: "left", fs: 16, fcl: "#333333", fw: "bold", fst: "normal", td: "none", fnt: "sourcesanspro"
}

LAYOUT GUIDELINES:
- MF_Section: 300-800px wide, 200-600px high
- MF_Note2: 120-200px wide, 80-150px high
- 20-50px spacing between sections
- 10-20px spacing between notes

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    title: 'Create Whiteboard',
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: {
                    'openai/outputTemplate': widgetUrl
                },
                inputSchema: {
                    type: 'object',
                    properties: {
                        components: {
                            type: 'object',
                            description: "Whiteboard components with 'c' array containing MF_Section, MF_Note2, MF_Text elements",
                            properties: {
                                c: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            t: { type: 'string', description: 'Component type: MF_Section, MF_Note2, MF_Text' },
                                            x: { type: 'number' },
                                            y: { type: 'number' },
                                            w: { type: 'number' },
                                            h: { type: 'number' },
                                            a: { type: 'number', description: 'Angle, always 0' },
                                            e: { type: 'string', description: 'Unique element ID' },
                                            tx: { type: 'string', description: 'Text content' },
                                            fc: { type: 'array', items: { type: 'string' }, description: 'Fill colors array' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    required: ['components']
                }
            },
            {
                name: 'render_customerjourney',
                description: `Create customer journey maps with stages, activities, and satisfaction metrics.

STRUCTURE:
- id: unique UUID string
- title: Journey map title
- theme: "default"
- cellWidth: 200
- stageName: "Journey Stages"
- stageColor: "#616161"

STAGES ARRAY:
Each stage: { id: "stage1", stage: "Stage Name", default: false, add: false, color: "#2563eb", fontColor: "white" }
Use distinct colors for each stage: #2563eb, #3b82f6, #10b981, #f59e0b, #ef4444

SECTION TYPES:

1. ICON SECTION (Activities):
{
  id: "sec1", name: "Activities", type: "icon", subtype: "bottom", add: false, color: "#deedec",
  items: {
    "stage1": { id: "item1", section: "sec1", color: "#000000", labelPlacement: "bottom",
      icons: [{ id: "icon1", iconname: "search", iconurl: "", icontype: "fontawesome", label: "Action description" }],
      size: "medium", getWidth: "42px"
    }
  },
  fontColor: "black", getWidth: "42px", getWidthNum: 42
}
FontAwesome icons: search, shopping-cart, credit-card, user, phone, envelope, check, star, heart, home, cog, bell

2. GRAPH SECTION (Satisfaction):
{
  id: "sec2", name: "Satisfaction", type: "graph", subtype: "", add: false, color: "#deedec",
  items: {
    "stage1": { id: "g1", num: 3, section: "sec2" }  // num 0-4: 0=excited, 1=happy, 2=neutral, 3=confused, 4=sad
  },
  graphs: [
    { id: "e1", iconname: "excited", iconurl: "", icontype: "emoji", label: "", width: "48px" },
    { id: "e2", iconname: "happy", iconurl: "", icontype: "emoji", label: "", width: "48px" },
    { id: "e3", iconname: "neutral", iconurl: "", icontype: "emoji", label: "", width: "48px" },
    { id: "e4", iconname: "confused", iconurl: "", icontype: "emoji", label: "", width: "48px" },
    { id: "e5", iconname: "sad", iconurl: "", icontype: "emoji", label: "", width: "48px" }
  ],
  graphsize: "medium", graphline: "curve", graphcolor: "#cccccc", graphtype: "dashed",
  fontColor: "black", getWidth: "48px", getWidthNum: 48
}

3. TEXT SECTION (Experiences/Expectations):
{
  id: "sec3", name: "Experiences", type: "text", subtype: "", add: false, color: "#deedec",
  items: {
    "stage1": { id: "t1", section: "sec3", content: "<p>Description text here</p>" }
  },
  fontColor: "black", getWidth: "48px", getWidthNum: 48
}

IMPORTANT: Items object keys MUST match stage IDs. Always display the returned URL to the user.`,
                annotations: {
                    title: 'Create Customer Journey Map',
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: {
                    'openai/outputTemplate': widgetUrl
                },
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', description: 'Unique UUID for the journey map' },
                        title: { type: 'string', description: 'Title of the customer journey' },
                        creator: { type: 'string', description: 'null' },
                        createDate: { type: 'string', description: 'null' },
                        updateDate: { type: 'string', description: 'null' },
                        theme: { type: 'string', description: '"default"' },
                        cellWidth: { type: 'integer', description: '200' },
                        stageName: { type: 'string', description: '"Journey Stages"' },
                        stageColor: { type: 'string', description: '"#616161"' },
                        stages: {
                            type: 'array',
                            description: 'Journey stages with id, stage name, color (#hex), fontColor ("white" or "black")',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    stage: { type: 'string' },
                                    default: { type: 'boolean' },
                                    add: { type: 'boolean' },
                                    color: { type: 'string' },
                                    fontColor: { type: 'string' }
                                }
                            }
                        },
                        sections: {
                            type: 'array',
                            items: { type: 'object' },
                            description: "Sections: type 'icon' (activities with FontAwesome icons), 'graph' (satisfaction 0-4), or 'text' (HTML content). Items keyed by stage ID."
                        }
                    },
                    required: ['id', 'title', 'stages', 'sections']
                }
            },
            {
                name: 'render_kanban',
                description: `Create a Kanban board with columns and task cards for project management, sprint planning, and task tracking.

STRUCTURE RULES:
- Create 3-5 columns with meaningful titles based on the topic
- CRITICAL: Each column MUST have a DIFFERENT color value - never repeat colors!
- Column IDs: "col_1", "col_2", "col_3", etc.
- Card IDs: "card_1", "card_2", "card_3", etc.
- Distribute 5-15 relevant cards across the columns
- If user mentions "only lists", "only columns", "no cards", or "empty lists", generate columns with empty cards arrays

COLUMN PROPERTIES:
- id: Unique string ID (e.g., "col_1")
- title: Column name (e.g., "To Do", "In Progress", "Done")
- color: Use these colors IN ORDER for columns: col_1="#e91e63", col_2="#ff9800", col_3="#9c27b0", col_4="#4caf50", col_5="#2196f3"
- cards: Array of card objects

CARD PROPERTIES:
- id: Unique string ID (e.g., "card_1")
- title: Task title (required)
- description: Task details
- assignees: Empty array []
- labels: Empty array []
- comments: Empty array []
- dueDate: null or ISO date string
- priority: "low", "medium", or "high"
- createdAt: ISO date string

SETTINGS:
- boardTitle: Meaningful title based on topic (e.g., "Sprint Planning", "Product Launch")
- showLabels: true, showAssignees: true, showDueDate: true
- cardSize: "normal"
- backgroundColor: "#ffffff", fontColor: "#172b4d", listColor: "#f4f5f7", listFontColor: "#172b4d"

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    title: 'Create Kanban Board',
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: {
                    'openai/outputTemplate': widgetUrl
                },
                inputSchema: {
                    type: 'object',
                    properties: {
                        columns: {
                            type: 'array',
                            description: 'Array of Kanban columns. Each column must have a different color.',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', description: 'Unique column ID (e.g., col_1, col_2)' },
                                    title: { type: 'string', description: 'Column title (e.g., To Do, In Progress, Done)' },
                                    color: { type: 'string', description: 'Column accent color. Use: #e91e63, #ff9800, #9c27b0, #4caf50, #2196f3' },
                                    cards: {
                                        type: 'array',
                                        description: 'Array of cards in this column',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string', description: 'Unique card ID (e.g., card_1)' },
                                                title: { type: 'string', description: 'Card title' },
                                                description: { type: 'string', description: 'Card description' },
                                                assignees: { type: 'array', items: { type: 'string' } },
                                                labels: { type: 'array', items: { type: 'string' } },
                                                comments: { type: 'array', items: { type: 'object' } },
                                                dueDate: { type: 'string', description: 'ISO date or null' },
                                                priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                                                createdAt: { type: 'string', description: 'ISO date string' }
                                            },
                                            required: ['id', 'title']
                                        }
                                    }
                                },
                                required: ['id', 'title', 'color', 'cards']
                            }
                        },
                        settings: {
                            type: 'object',
                            description: 'Board settings',
                            properties: {
                                showLabels: { type: 'boolean', default: true },
                                showAssignees: { type: 'boolean', default: true },
                                showDueDate: { type: 'boolean', default: true },
                                cardSize: { type: 'string', default: 'normal' },
                                backgroundColor: { type: 'string', default: '#ffffff' },
                                fontColor: { type: 'string', default: '#172b4d' },
                                listColor: { type: 'string', default: '#f4f5f7' },
                                listFontColor: { type: 'string', default: '#172b4d' },
                                boardTitle: { type: 'string', description: 'Title of the Kanban board' }
                            }
                        }
                    },
                    required: ['columns', 'settings']
                }
            },
            {
                name: 'render_gantt',
                description: `Create a Gantt chart with project phases and tasks on a timeline for project planning, scheduling, and milestone tracking.

STRUCTURE RULES:
- Create 3-5 columns representing project phases/categories with meaningful titles
- CRITICAL: Each column MUST have a DIFFERENT color value - never repeat colors!
- Column IDs: "col_1", "col_2", "col_3", etc.
- Card IDs: "card_1", "card_2", "card_3", etc.
- Distribute 5-15 relevant tasks across the columns
- Each task MUST have startDate and endDate as valid ISO date strings
- Tasks should have realistic, sequential dates - later phases should start after earlier phases
- If user mentions "only phases", "only groups", "no tasks", or "empty phases", generate columns with empty cards arrays

COLUMN PROPERTIES:
- id: Unique string ID (e.g., "col_1")
- title: Phase/category name (e.g., "Planning", "Development", "Testing")
- color: Use these colors IN ORDER: col_1="#1c7ce2", col_2="#ff9800", col_3="#9c27b0", col_4="#4caf50", col_5="#2196f3"
- fontColor: "#5e6c84"
- cards: Array of task card objects

CARD PROPERTIES:
- id: Unique string ID (e.g., "card_1")
- title: Task title (required)
- description: Task details
- startDate: ISO date string (required)
- endDate: ISO date string (required, must be >= startDate)
- dueDate: Same as endDate
- progress: Number 0-100 (0 for future tasks, 10-80 for current)
- assignees: Empty array []
- labels: Empty array []
- comments: Empty array []
- priority: "low", "medium", or "high"
- createdAt: ISO date string

SETTINGS:
- boardTitle: Meaningful title based on topic
- viewMode: "day"
- theme: "light"
- showWeekends: true

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    title: 'Create Gantt Chart',
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: {
                    'openai/outputTemplate': widgetUrl
                },
                inputSchema: {
                    type: 'object',
                    properties: {
                        columns: {
                            type: 'array',
                            description: 'Array of Gantt chart columns/phases. Each column must have a different color.',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', description: 'Unique column ID (e.g., col_1, col_2)' },
                                    title: { type: 'string', description: 'Phase/category title (e.g., Planning, Development)' },
                                    color: { type: 'string', description: 'Column accent color. Use: #1c7ce2, #ff9800, #9c27b0, #4caf50, #2196f3' },
                                    fontColor: { type: 'string', description: 'Font color for column', default: '#5e6c84' },
                                    cards: {
                                        type: 'array',
                                        description: 'Array of task cards in this phase',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string', description: 'Unique card ID (e.g., card_1)' },
                                                title: { type: 'string', description: 'Task title' },
                                                description: { type: 'string', description: 'Task description' },
                                                startDate: { type: 'string', description: 'Start date in ISO format' },
                                                endDate: { type: 'string', description: 'End date in ISO format (>= startDate)' },
                                                dueDate: { type: 'string', description: 'Due date (same as endDate)' },
                                                progress: { type: 'number', description: 'Progress 0-100' },
                                                assignees: { type: 'array', items: { type: 'string' } },
                                                labels: { type: 'array', items: { type: 'string' } },
                                                comments: { type: 'array', items: { type: 'object' } },
                                                priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                                                createdAt: { type: 'string', description: 'ISO date string' }
                                            },
                                            required: ['id', 'title', 'startDate', 'endDate']
                                        }
                                    }
                                },
                                required: ['id', 'title', 'color', 'cards']
                            }
                        },
                        settings: {
                            type: 'object',
                            description: 'Chart settings',
                            properties: {
                                boardTitle: { type: 'string', description: 'Title of the Gantt chart' },
                                viewMode: { type: 'string', default: 'day', description: 'View mode: day, week, or month' },
                                theme: { type: 'string', default: 'light' },
                                showWeekends: { type: 'boolean', default: true }
                            }
                        }
                    },
                    required: ['columns', 'settings']
                }
            },
            {
                name: 'render_calendar',
                description: `Create a calendar with events for schedules, appointments, holidays, and event planning.

STRUCTURE RULES:
- Create as many events as needed for the topic (up to 100 events for yearly calendars)
- Use realistic dates spread across the relevant time period
- IMPORTANT: Pick ONE color and use it for ALL events
- Events should have meaningful titles and descriptions related to the topic

EVENT PROPERTIES:
- id: Unique string ID (e.g., "event_1", "event_2")
- title: Event name (required)
- description: Event details
- start: ISO 8601 date string with Z suffix (required)
- end: ISO 8601 date string with Z suffix
- allDay: true or false
- color: One of "#4285f4", "#ea4335", "#fbbc04", "#34a853", "#ff6d01", "#46bdc6", "#7986cb", "#8e24aa" - USE SAME COLOR FOR ALL EVENTS
- location: Location string (optional)
- attendees: Empty array []
- reminders: Empty array []
- recurrence: null
- createdAt: ISO date string

DATE RULES (CRITICAL):
- TIMED EVENTS (allDay: false): end MUST be on SAME DAY as start
  Example: start "2025-01-15T09:00:00.000Z", end "2025-01-15T11:00:00.000Z"
- ALL-DAY EVENTS (allDay: true): end MUST be EXACTLY the same as start
  Example: start "2025-01-15T00:00:00.000Z", end "2025-01-15T00:00:00.000Z"
- For timed events, set reasonable durations (1-3 hours typically)
- All dates must be valid ISO 8601 format with Z suffix for UTC

SETTINGS:
- theme: "default"
- weekStartsOn: 0 (Sunday) or 1 (Monday)
- dateFormat: "MM/DD/YYYY" or "DD/MM/YYYY"
- timeFormat: "12h" or "24h"
- highlightWeekends: true or false
- showWeekNumbers: true or false

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    title: 'Create Calendar',
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: {
                    'openai/outputTemplate': widgetUrl
                },
                inputSchema: {
                    type: 'object',
                    properties: {
                        events: {
                            type: 'array',
                            description: 'Array of calendar events. Use same color for all events.',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', description: 'Unique event ID (e.g., event_1)' },
                                    title: { type: 'string', description: 'Event title' },
                                    description: { type: 'string', description: 'Event description' },
                                    start: { type: 'string', description: 'Start date/time in ISO 8601 format with Z suffix' },
                                    end: { type: 'string', description: 'End date/time. For timed events: same day as start. For all-day: equals start.' },
                                    allDay: { type: 'boolean', description: 'True for all-day events' },
                                    color: { type: 'string', description: 'Event color. Use one of: #4285f4, #ea4335, #fbbc04, #34a853, #ff6d01, #46bdc6, #7986cb, #8e24aa' },
                                    location: { type: 'string', description: 'Event location' },
                                    attendees: { type: 'array', items: { type: 'string' } },
                                    reminders: { type: 'array', items: { type: 'object' } },
                                    recurrence: { type: 'string', description: 'Recurrence rule or null' },
                                    createdAt: { type: 'string', description: 'ISO date string' }
                                },
                                required: ['id', 'title', 'start']
                            }
                        },
                        settings: {
                            type: 'object',
                            description: 'Calendar settings',
                            properties: {
                                theme: { type: 'string', default: 'default' },
                                weekStartsOn: { type: 'integer', enum: [0, 1], description: '0 for Sunday, 1 for Monday' },
                                dateFormat: { type: 'string', enum: ['MM/DD/YYYY', 'DD/MM/YYYY'], default: 'MM/DD/YYYY' },
                                timeFormat: { type: 'string', enum: ['12h', '24h'], default: '12h' },
                                highlightWeekends: { type: 'boolean', default: true },
                                showWeekNumbers: { type: 'boolean', default: false }
                            }
                        }
                    },
                    required: ['events', 'settings']
                }
            },
            {
                name: 'render_storyboard',
                title: 'Create Storyboard',
                description: `Create a film/video storyboard with scenes and frames for visualizing stories, movie sequences, commercials, and video content.

STRUCTURE RULES:
- Create exactly 1 scene containing all frames (single scene component)
- Generate 6-10 frames depending on story complexity
- Each frame needs a unique id (e.g., "frame_1", "frame_2")
- sequence numbers should be consecutive starting from 1

FRAME PROPERTIES:
- id: Unique string ID (e.g., "frame_1")
- sequence: Frame number (1, 2, 3...)
- title: Short descriptive title for the frame
- description: DETAILED cinematic description including:
  - Camera angle/movement (wide shot, close-up, pan, tracking)
  - Action and dialogue
  - Lighting and mood
  - Visual elements and composition
- coverType: null (images generated separately if requested)
- coverFileID: null
- metadata: Object with field1-field4 for custom metadata (empty strings)
- comments: Empty array []
- aiGenerated: true
- createdAt: ISO date string

SCENE PROPERTIES:
- id: "scene_default" or unique ID
- title: Scene name (e.g., "Act 1 - Opening")
- isDefault: true for main scene
- color: Hex color for scene indicator (e.g., "#e94560")
- frames: Array of frame objects

SETTINGS PROPERTIES:
- boardTitle: Descriptive title based on the story
- theme: "light" or "dark"
- frameSize: "small", "medium", or "large"
- storyboardSettings.brandGuide.artStyle: Visual style (e.g., "cinematic", "sketch", "realistic", "anime", "noir")
- storyboardSettings.brandGuide.styleNotes: Additional style instructions

DESCRIPTION GUIDELINES:
- Use proper cinematic terminology (establishing shot, close-up, tracking shot, etc.)
- Include camera direction (pan left, zoom in, dolly forward)
- Describe lighting (natural light, dramatic shadows, golden hour)
- Convey mood and atmosphere
- Include relevant dialogue snippets in quotes
- Keep descriptions 2-4 sentences, detailed but concise

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    title: 'Create Storyboard',
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: createToolMeta('Storyboard'),
                outputSchema: outputSchema,
                inputSchema: {
                    type: 'object',
                    properties: {
                        scenes: {
                            type: 'array',
                            description: 'Array containing one scene with frames',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', description: 'Scene ID (e.g., "scene_default")' },
                                    title: { type: 'string', description: 'Scene title' },
                                    isDefault: { type: 'boolean', description: 'true for main scene' },
                                    color: { type: 'string', description: 'Scene color (e.g., "#e94560")' },
                                    frames: {
                                        type: 'array',
                                        description: 'Array of frame objects',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string', description: 'Unique frame ID (e.g., "frame_1")' },
                                                sequence: { type: 'integer', description: 'Frame sequence number starting from 1' },
                                                title: { type: 'string', description: 'Short frame title' },
                                                description: { type: 'string', description: 'Detailed cinematic description with camera angles, action, lighting, mood' },
                                                coverType: { type: 'string', description: 'null' },
                                                coverFileID: { type: 'string', description: 'null' },
                                                metadata: {
                                                    type: 'object',
                                                    properties: {
                                                        field1: { type: 'string' },
                                                        field2: { type: 'string' },
                                                        field3: { type: 'string' },
                                                        field4: { type: 'string' }
                                                    }
                                                },
                                                comments: { type: 'array', items: { type: 'object' } },
                                                aiGenerated: { type: 'boolean', description: 'true' },
                                                createdAt: { type: 'string', description: 'ISO date string' }
                                            },
                                            required: ['id', 'sequence', 'title', 'description']
                                        }
                                    }
                                },
                                required: ['id', 'title', 'frames']
                            }
                        },
                        settings: {
                            type: 'object',
                            description: 'Storyboard settings',
                            properties: {
                                boardTitle: { type: 'string', description: 'Storyboard title' },
                                theme: { type: 'string', enum: ['light', 'dark'], default: 'light' },
                                showMetadata: { type: 'boolean', default: true },
                                frameSize: { type: 'string', enum: ['small', 'medium', 'large'], default: 'medium' },
                                storyboardSettings: {
                                    type: 'object',
                                    properties: {
                                        customFields: { type: 'array', items: { type: 'object' } },
                                        frameNumber: {
                                            type: 'object',
                                            properties: {
                                                format: { type: 'string', default: 'number' },
                                                prefix: { type: 'string', default: '' },
                                                startFrom: { type: 'integer', default: 1 }
                                            }
                                        },
                                        brandGuide: {
                                            type: 'object',
                                            properties: {
                                                primaryColor: { type: 'string', default: '#1c7ce2' },
                                                secondaryColor: { type: 'string', default: '#6c757d' },
                                                accentColor: { type: 'string', default: '#e94560' },
                                                bgColor: { type: 'string', default: '#ffffff' },
                                                artStyle: { type: 'string', description: 'Visual style: cinematic, sketch, realistic, anime, noir' },
                                                styleNotes: { type: 'string', description: 'Additional style instructions' }
                                            }
                                        },
                                        features: {
                                            type: 'object',
                                            properties: {
                                                enableCharacters: { type: 'boolean', default: true },
                                                enableScenes: { type: 'boolean', default: true }
                                            }
                                        },
                                        characters: { type: 'array', items: { type: 'object' } },
                                        customScenes: { type: 'array', items: { type: 'object' } }
                                    }
                                }
                            }
                        }
                    },
                    required: ['scenes', 'settings']
                }
            },
            {
                name: 'render_database',
                title: 'Create Database Diagram',
                description: `Create database diagrams (ER diagrams) showing tables, columns, primary keys, foreign keys, and relationships.

STRUCTURE:
- class: "GraphLinksModel"
- category: "database"
- nodeDataArray: Array of table objects
- linkDataArray: Array of foreign key relationships

TABLE (NODE) PROPERTIES:
- key: Unique string identifier (e.g., "users", "orders")
- text: Table display name (e.g., "Users", "Orders")
- color: Hex accent/header border color
- fillColor: Hex header background color
- columns: Array of column objects

COLUMN PROPERTIES:
- name: Column name (e.g., "id", "username")
- type: SQL data type (e.g., "INT", "VARCHAR(50)", "DECIMAL(10,2)", "TIMESTAMP", "BOOLEAN", "TEXT")
- pk: true if primary key, false otherwise
- fk: true if foreign key, false otherwise

TABLE COLORS (use distinct colors per table):
- "#4FC3F7"/"#0288D1" (blue), "#81C784"/"#388E3C" (green), "#FFB74D"/"#F57C00" (orange)
- "#CE93D8"/"#7B1FA2" (purple), "#7986CB"/"#303F9F" (indigo), "#EF5350"/"#C62828" (red)

RELATIONSHIP (LINK) PROPERTIES:
- from: Source table key (table with the foreign key)
- to: Target table key (table being referenced)
- text: Relationship label (e.g., "user_id → id")

Do NOT include loc, width, height, shape, matchKey, fromSpot, toSpot — the frontend handles all positioning.

GUIDELINES:
- Create 2-8 tables depending on schema complexity
- Each table should have 3-8 columns
- Always mark at least one column as pk: true per table
- Mark foreign key columns as fk: true
- Only include relationships where a foreign key actually exists

EXAMPLE:
{
  "class": "GraphLinksModel",
  "category": "database",
  "nodeDataArray": [
    { "key": "users", "text": "Users", "color": "#4FC3F7", "fillColor": "#0288D1", "columns": [
      { "name": "id", "type": "INT", "pk": true, "fk": false },
      { "name": "username", "type": "VARCHAR(50)", "pk": false, "fk": false },
      { "name": "email", "type": "VARCHAR(100)", "pk": false, "fk": false }
    ]},
    { "key": "orders", "text": "Orders", "color": "#81C784", "fillColor": "#388E3C", "columns": [
      { "name": "id", "type": "INT", "pk": true, "fk": false },
      { "name": "user_id", "type": "INT", "pk": false, "fk": true },
      { "name": "total", "type": "DECIMAL(10,2)", "pk": false, "fk": false }
    ]}
  ],
  "linkDataArray": [
    { "from": "orders", "to": "users", "text": "user_id → id" }
  ]
}

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: createToolMeta('Database Diagram'),
                outputSchema: outputSchema,
                inputSchema: {
                    type: 'object',
                    properties: {
                        class: {
                            type: 'string',
                            description: "Always 'GraphLinksModel'"
                        },
                        category: {
                            type: 'string',
                            enum: ['database'],
                            description: "Must be 'database'"
                        },
                        nodeDataArray: {
                            type: 'array',
                            description: 'Array of database tables with key, text, color, fillColor, and columns array',
                            items: {
                                type: 'object',
                                properties: {
                                    key: { type: 'string', description: 'Unique table identifier' },
                                    text: { type: 'string', description: 'Table display name' },
                                    color: { type: 'string', description: 'Header border color' },
                                    fillColor: { type: 'string', description: 'Header background color' },
                                    columns: {
                                        type: 'array',
                                        description: 'Array of column definitions',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                name: { type: 'string', description: 'Column name' },
                                                type: { type: 'string', description: 'SQL data type (INT, VARCHAR, DECIMAL, etc.)' },
                                                pk: { type: 'boolean', description: 'True if primary key' },
                                                fk: { type: 'boolean', description: 'True if foreign key' }
                                            },
                                            required: ['name', 'type', 'pk', 'fk']
                                        }
                                    }
                                },
                                required: ['key', 'text', 'columns']
                            }
                        },
                        linkDataArray: {
                            type: 'array',
                            description: 'Array of foreign key relationships between tables',
                            items: {
                                type: 'object',
                                properties: {
                                    from: { type: 'string', description: 'Source table key (table with FK)' },
                                    to: { type: 'string', description: 'Target table key (referenced table)' },
                                    text: { type: 'string', description: 'Relationship label (e.g., "user_id → id")' }
                                },
                                required: ['from', 'to']
                            }
                        }
                    },
                    required: ['class', 'category', 'nodeDataArray', 'linkDataArray']
                }
            },
            {
                name: 'render_swimlane',
                title: 'Create Swimlane Diagram',
                description: `Create swimlane (cross-functional) diagrams with horizontal rows representing actors, departments, or roles, and flowchart nodes positioned within them.

STRUCTURE:
- class: "GraphLinksModel"
- swimlaneRows: Array of horizontal swim lane definitions
- nodeDataArray: Array of flowchart nodes assigned to rows
- linkDataArray: Array of connections between nodes

SWIMLANE ROW PROPERTIES:
- id: Unique string (e.g., "row_1", "row_2")
- title: Descriptive label for the lane (actor, department, role)
- color: Hex background color (soft pastels)

ROW COLORS:
- "#E3F2FD" (light blue), "#FFF3E0" (light orange), "#E8F5E9" (light green)
- "#F3E5F5" (light purple), "#FFF8E1" (light yellow), "#FCE4EC" (light pink)

NODE PROPERTIES:
- key: Unique string identifier
- text: Label text
- row: Must match a swimlaneRows id
- loc: Position as "x y" string
- width: 120 for processes, 100 for diamonds
- height: 60 for processes, 80 for diamonds
- shape: "RoundedRectangle" (process), "Diamond" (decision), "Ellipse" (start/end), "Rectangle" (data)
- color: Hex color for the node

NODE COLORS by type:
- Processes: "#4FC3F7", Decisions: "#FFB74D", Start/End: "#81C784", Data: "#CE93D8"

LAYOUT RULES:
- Flow goes left-to-right within rows
- Cross-row connections show handoffs between actors
- Row spacing: 150-200px apart vertically
- Node spacing: 200-250px apart horizontally
- Start x at 200+ (row label column is 60px wide)
- Y positions: row_1 ~ y:100, row_2 ~ y:300, row_3 ~ y:500

LINK PROPERTIES:
- from/to: Node keys
- fromSpot/toSpot: "Right", "Left", "Top", "Bottom"
- Same-row: "Right" → "Left"
- Cross-row down: "Bottom" → "Top"
- Cross-row up: "Top" → "Bottom"
- text: Labels for decision branches ("Yes", "No", "Approved")

GUIDELINES:
- Create 3-6 rows based on actors/roles in the process
- Each row should have at least 1-2 nodes
- Decision nodes should have at least 2 outgoing links with labels
- Start and end nodes typically in first and last rows

EXAMPLE:
{
  "class": "GraphLinksModel",
  "swimlaneRows": [
    { "id": "row_1", "title": "Customer", "color": "#E3F2FD" },
    { "id": "row_2", "title": "Sales Team", "color": "#FFF3E0" },
    { "id": "row_3", "title": "Management", "color": "#E8F5E9" }
  ],
  "nodeDataArray": [
    { "key": "start", "text": "Submit Request", "row": "row_1", "loc": "200 100", "width": 120, "height": 60, "shape": "Ellipse", "color": "#81C784" },
    { "key": "review", "text": "Review Request", "row": "row_2", "loc": "450 300", "width": 120, "height": 60, "shape": "RoundedRectangle", "color": "#4FC3F7" },
    { "key": "decide", "text": "Approve?", "row": "row_3", "loc": "700 500", "width": 100, "height": 80, "shape": "Diamond", "color": "#FFB74D" },
    { "key": "done", "text": "Complete", "row": "row_1", "loc": "950 100", "width": 120, "height": 60, "shape": "Ellipse", "color": "#81C784" }
  ],
  "linkDataArray": [
    { "from": "start", "to": "review", "fromSpot": "Right", "toSpot": "Left" },
    { "from": "review", "to": "decide", "fromSpot": "Right", "toSpot": "Left" },
    { "from": "decide", "to": "done", "fromSpot": "Right", "toSpot": "Left", "text": "Yes" }
  ]
}

IMPORTANT: Always display the returned URL to the user.`,
                annotations: {
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _meta: createToolMeta('Swimlane Diagram'),
                outputSchema: outputSchema,
                inputSchema: {
                    type: 'object',
                    properties: {
                        class: {
                            type: 'string',
                            description: "Always 'GraphLinksModel'"
                        },
                        swimlaneRows: {
                            type: 'array',
                            description: 'Array of horizontal swim lane definitions',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', description: 'Unique row ID (e.g., "row_1")' },
                                    title: { type: 'string', description: 'Lane label (actor, department, role)' },
                                    color: { type: 'string', description: 'Background color (soft pastel hex)' }
                                },
                                required: ['id', 'title', 'color']
                            }
                        },
                        nodeDataArray: {
                            type: 'array',
                            description: 'Array of flowchart nodes assigned to swim lanes',
                            items: {
                                type: 'object',
                                properties: {
                                    key: { type: 'string', description: 'Unique node identifier' },
                                    text: { type: 'string', description: 'Node label' },
                                    row: { type: 'string', description: 'swimlaneRows id this node belongs to' },
                                    loc: { type: 'string', description: 'Position as "x y" string' },
                                    width: { type: 'number', description: '120 for processes, 100 for diamonds' },
                                    height: { type: 'number', description: '60 for processes, 80 for diamonds' },
                                    shape: { type: 'string', enum: ['RoundedRectangle', 'Diamond', 'Ellipse', 'Rectangle'], description: 'Node shape' },
                                    color: { type: 'string', description: 'Node hex color' }
                                },
                                required: ['key', 'text', 'row', 'loc', 'shape', 'color']
                            }
                        },
                        linkDataArray: {
                            type: 'array',
                            description: 'Array of connections between nodes',
                            items: {
                                type: 'object',
                                properties: {
                                    from: { type: 'string', description: 'Source node key' },
                                    to: { type: 'string', description: 'Target node key' },
                                    fromSpot: { type: 'string', enum: ['Top', 'Bottom', 'Left', 'Right'] },
                                    toSpot: { type: 'string', enum: ['Top', 'Bottom', 'Left', 'Right'] },
                                    text: { type: 'string', description: 'Link label (e.g., "Yes", "No")' }
                                },
                                required: ['from', 'to', 'fromSpot', 'toSpot']
                            }
                        }
                    },
                    required: ['class', 'swimlaneRows', 'nodeDataArray', 'linkDataArray']
                }
            }
        ];
    }

    /**
     * Get human-readable title for action type
     */
    getActionTitle(actionType) {
        const titles = {
            flowchart: 'Flowchart',
            mindmap: 'Mind Map',
            cloudarchitecture: 'Cloud Architecture Diagram',
            chart: 'Chart',
            table: 'Data Table',
            markdown: 'Markdown Document',
            map: 'Map',
            spreadsheet: 'Spreadsheet',
            whiteboard: 'Whiteboard',
            customerjourney: 'Customer Journey Map',
            kanban: 'Kanban Board',
            gantt: 'Gantt Chart',
            calendar: 'Calendar',
            storyboard: 'Storyboard',
            database: 'Database Diagram',
            swimlane: 'Swimlane Diagram',
            // Flowchart categories
            'flowchart-default': 'Flowchart',
            'flowchart-sketchy': 'Sketchy Flowchart',
            'flowchart-3d': '3D Flowchart',
            'flowchart-bio': 'Bio Diagram',
            'flowchart-circuit': 'Circuit Diagram',
            'flowchart-pandid': 'P&ID Diagram',
            'flowchart-uml': 'UML Diagram',
            'flowchart-uml-sketchy': 'Sketchy UML Diagram',
            'flowchart-cloud-isometric': 'Cloud Isometric Diagram',
            'flowchart-weblayout': 'Web Layout Diagram',
            'flowchart-mobilelayout': 'Mobile Layout Diagram'
        };
        return titles[actionType] || 'Visualization';
    }

    /**
     * Handle resources/read for ChatGPT Apps SDK UI widgets
     */
    handleResourcesRead(params) {
        const { uri } = params;

        if (uri === 'ui://ideaboard/preview-widget.html') {
            return {
                contents: [
                    {
                        uri: uri,
                        mimeType: 'text/html+skybridge',
                        text: this.getPreviewWidgetHtml(),
                        // OpenAI-specific metadata for widget rendering
                        _meta: {
                            'openai/widgetPrefersBorder': true,
                            'openai/widgetDescription': 'IdeaBoard visualization preview with thumbnail and link',
                            'openai/widgetDomain': 'https://app.mockflow.com',
                            'openai/widgetCSP': {
                                connect_domains: [
                                    'https://app.mockflow.com',
                                    'https://assets.mockflow.com',
                                    'https://testmfassets.s3.amazonaws.com'
                                ],
                                resource_domains: [
                                    'https://assets.mockflow.com',
                                    'https://testmfassets.s3.amazonaws.com',
                                    'https://*.amazonaws.com'
                                ]
                            }
                        }
                    }
                ]
            };
        }

        throw new Error(`Resource not found: ${uri}`);
    }

    /**
     * Get the HTML/JS for the preview widget (ChatGPT Apps SDK)
     * This widget displays thumbnail and URL in a nice card UI
     */
    getPreviewWidgetHtml() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IdeaBoard Preview</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: inherit;
            background: transparent;
            padding: 0;
        }
        .preview-card {
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            max-width: 480px;
        }
        .preview-card.dark {
            background: #212121;
            border-color: #424242;
        }
        .thumbnail-container {
            width: 100%;
            background: #f5f5f5;
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 120px;
            max-height: 320px;
        }
        .dark .thumbnail-container {
            background: #303030;
        }
        .thumbnail {
            max-width: 100%;
            max-height: 320px;
            object-fit: contain;
            cursor: pointer;
            transition: opacity 0.2s ease;
        }
        .thumbnail:hover {
            opacity: 0.9;
        }
        .thumbnail-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            color: #9e9e9e;
            font-size: 14px;
        }
        .card-content {
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }
        .card-info {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
        }
        .card-title {
            font-size: 14px;
            font-weight: 500;
            color: #212121;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .dark .card-title {
            color: #e0e0e0;
        }
        .card-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            background: #e3f2fd;
            color: #1565c0;
            font-size: 11px;
            font-weight: 500;
            border-radius: 4px;
            text-transform: uppercase;
            flex-shrink: 0;
        }
        .dark .card-badge {
            background: #1e3a5f;
            color: #64b5f6;
        }
        .edit-button {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: #10a37f;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s ease;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .edit-button:hover {
            background: #0d8a6a;
        }
        .edit-button svg {
            width: 14px;
            height: 14px;
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: #757575;
        }
        .click-hint {
            position: absolute;
            bottom: 8px;
            right: 8px;
            background: rgba(0,0,0,0.6);
            color: white;
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 4px;
            opacity: 0;
            transition: opacity 0.2s;
        }
        .thumbnail-container:hover .click-hint {
            opacity: 1;
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="loading">Loading preview...</div>
    </div>

    <script>
        (function() {
            let rendered = false;
            let cachedToolOutput = null;

            function render(toolOutputOverride) {
                if (rendered) return; // Only render once

                const app = document.getElementById('app');
                if (!app) return;

                // Use override from event, or cached, or from window.openai
                const toolOutput = toolOutputOverride || cachedToolOutput || (window.openai ? window.openai.toolOutput : null);
                const theme = (window.openai ? window.openai.theme : null) || 'light';

                console.log('[IdeaBoard Widget] render() called - toolOutput:', JSON.stringify(toolOutput));

                // If no data yet, show loading
                if (!toolOutput || (typeof toolOutput === 'object' && Object.keys(toolOutput).length === 0)) {
                    console.log('[IdeaBoard Widget] No toolOutput yet, showing loading...');
                    app.innerHTML = '<div class="loading">Loading preview...</div>';
                    return;
                }

                rendered = true;
                console.log('[IdeaBoard Widget] Data received, rendering preview');
                console.log('[IdeaBoard Widget] toolOutput keys:', Object.keys(toolOutput));

                // Get data from structuredContent (could be nested or direct)
                const toolOutputRaw = toolOutput || {};
                const structuredContent = toolOutputRaw.structuredContent || toolOutputRaw || {};
                const metadata = window.openai.toolResponseMetadata || {};

                // Data comes from structuredContent
                const url = structuredContent.url || '';
                const thumbnailUrl = structuredContent.thumbnailUrl || '';
                const title = structuredContent.title || metadata.title || 'Visualization';
                const actionType = structuredContent.actionType || '';

                console.log('[IdeaBoard Widget] Extracted - url:', url, 'thumbnail:', thumbnailUrl);

                if (!url) {
                    // Show debug info in the widget for troubleshooting
                    app.innerHTML = '<div class="loading">No preview available<br><small style="font-size:9px;color:#999;">toolOutput: ' + JSON.stringify(toolOutputRaw).substring(0,200) + '</small></div>';
                    return;
                }

                // Render the preview card
                app.innerHTML = \`
                    <div class="preview-card \${theme === 'dark' ? 'dark' : ''}">
                        <div class="thumbnail-container" onclick="openImage()">
                            \${thumbnailUrl
                                ? \`<img class="thumbnail" src="\${thumbnailUrl}" alt="\${title}"/>\`
                                : '<div class="thumbnail-placeholder">Preview loading...</div>'
                            }
                            <div class="click-hint">Click to view full image</div>
                        </div>
                        <div class="card-content">
                            <div class="card-info">
                                <span class="card-title">\${title}</span>
                                <span class="card-badge">\${actionType}</span>
                            </div>
                            <button class="edit-button" onclick="openEditor()">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit in IdeaBoard (no login)
                            </button>
                        </div>
                    </div>
                \`;

                // Handle image load errors
                const img = app.querySelector('.thumbnail');
                if (img) {
                    img.onerror = function() {
                        this.parentElement.innerHTML = '<div class="thumbnail-placeholder">Preview unavailable</div>';
                    };
                }

                // Store URLs for click handlers
                window.ideaboardUrl = url;
                window.ideaboardThumbnailUrl = thumbnailUrl;

                // Notify host of our height
                if (window.openai && window.openai.notifyIntrinsicHeight) {
                    setTimeout(() => {
                        window.openai.notifyIntrinsicHeight(app.offsetHeight);
                    }, 100);
                }
            }

            // Open thumbnail image in new tab
            window.openImage = function() {
                if (window.ideaboardThumbnailUrl) {
                    if (window.openai && window.openai.openExternal) {
                        window.openai.openExternal({ href: window.ideaboardThumbnailUrl });
                    } else {
                        window.open(window.ideaboardThumbnailUrl, '_blank');
                    }
                }
            };

            // Open editor in new tab
            window.openEditor = function() {
                if (window.ideaboardUrl) {
                    if (window.openai && window.openai.openExternal) {
                        window.openai.openExternal({ href: window.ideaboardUrl });
                    } else {
                        window.open(window.ideaboardUrl, '_blank');
                    }
                }
            };

            // Listen for ChatGPT to update globals (including toolOutput)
            window.addEventListener('openai:set_globals', function(event) {
                console.log('[IdeaBoard Widget] openai:set_globals event received');
                console.log('[IdeaBoard Widget] event.detail:', JSON.stringify(event.detail));

                // Extract toolOutput from event.detail.globals (per OpenAI docs)
                const globals = event.detail?.globals;
                if (globals?.toolOutput) {
                    console.log('[IdeaBoard Widget] Got toolOutput from event:', JSON.stringify(globals.toolOutput));
                    cachedToolOutput = globals.toolOutput;
                    render(globals.toolOutput);
                }
            }, { passive: true });

            // Also try rendering immediately in case data is already available
            function tryRender() {
                if (window.openai?.toolOutput && Object.keys(window.openai.toolOutput).length > 0) {
                    console.log('[IdeaBoard Widget] Data available on init');
                    render(window.openai.toolOutput);
                } else {
                    console.log('[IdeaBoard Widget] No data on init, waiting for event...');
                    render(); // Show loading state
                }
            }

            if (document.readyState === 'complete') {
                tryRender();
            } else {
                window.addEventListener('DOMContentLoaded', tryRender);
            }

            // Fallback: poll a few times in case event doesn't fire
            let pollCount = 0;
            const pollInterval = setInterval(function() {
                pollCount++;
                if (window.openai?.toolOutput && Object.keys(window.openai.toolOutput).length > 0) {
                    console.log('[IdeaBoard Widget] Poll found data at attempt', pollCount);
                    clearInterval(pollInterval);
                    render(window.openai.toolOutput);
                }
                if (pollCount >= 50) { // Stop after 5 seconds
                    clearInterval(pollInterval);
                    console.log('[IdeaBoard Widget] Poll timeout, final render');
                    render(); // Final attempt with whatever we have
                }
            }, 100);
        })();
    </script>
</body>
</html>`;
    }
}

module.exports = MCPHandler;
