/**
 * IdeaBoard MCP Component Registry
 *
 * The catalog of MCP tools an AI agent can call to draw on a MockFlow IdeaBoard.
 * Each entry has the tool definition (mcpToolName, mcpInputSchema, mcpDescription)
 * plus the client-side rendering mapping (clientAitype / clientComp / clientTransform /
 * clientIsHtmlConversion) used to turn a tool call into component data.
 *
 * Every MCP server and the bridge build their tool list from this array. It is a
 * derived catalog: each component's capabilities and scope mirror the MockFlow
 * component registry, so keep the two in step when a component's scope changes
 * (correlate entries by recipe key) and run `node --check` after edits.
 *
 * ===== Filling a component in place =====
 * A component's Generate / Modify AI (QuickSettings, and the chat modify tool) runs
 * on a LOCAL agent by handing the tool's output to the component being edited instead
 * of drawing a new one. An HTML-conversion tool (clientIsHtmlConversion) normally
 * cannot do that, because its output is converted and drawn by the tab. Declare
 * `clientHtmlFillsInPlace: true` when the component CAN adopt that conversion as its
 * own content (its sendGenText takes the converted result), or its local Generate /
 * Modify has no tool to run and always falls back to MockFlow AI.
 *
 * ===== Image slots (local agents) =====
 * A local agent is a text model: it can author a component but cannot produce
 * the imagery inside it. MockFlow generates that imagery in the user's own tab,
 * against their AI credits, so it is their choice - which the bridge asks for
 * once per turn, the moment an image-capable tool is reached. Three fields drive
 * the whole flow, so a component gains it by declaring them and nothing else:
 *
 *   imageSlots         true when this component can carry AI-generated imagery.
 *                      This alone is what makes the bridge ask the user.
 *   imageSlotForm      what a filled slot is replaced with: 'imageID' for a
 *                      component that stores a library id, 'url' for one that
 *                      stores a link. Ignored for slots written inside an HTML
 *                      or markdown document, which always take a URL.
 *   imageSlotGuidance  one sentence telling the agent WHERE this component's
 *                      slots go. Delivered when the user says yes, so the agent
 *                      renders again with them.
 *
 * A slot is written the way its medium already expresses an image, so the same
 * content works whichever AI produced it: "mfimg::<what the picture shows>" as a
 * field value in component data, <img data-ai-prompt="..."> in HTML, and
 * ![alt](prompt:: "...") in markdown. Mirror any component's own image capability
 * (AI_REGISTRY aiImageEnabled / askImages) when you add or remove these.
 */

var IDEABOARD_MCP_REGISTRY = [
    {
        mcpToolName: 'render_flowchart',
        mcpDescription: `Create diagrams including: Flowcharts, Sketchy Diagrams, 3D Isometric Diagrams, Bio/Medical Diagrams, Circuit Diagrams, P&ID Diagrams, UML Diagrams, Sketchy UML, Cloud Isometric Diagrams, Web Layout Diagrams, and Mobile Layout Diagrams. NOT for cross-functional/swimlane (lane-per-role) diagrams — use render_swimlane; NOT for AWS/Azure/GCP cloud infrastructure — use render_cloudarchitecture; NOT for database/ER schemas — use render_database.

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
        mcpInputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'A short title for the diagram, shown as the frame header (e.g. "User Signup Flow").'
                },
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'genflow',
        clientComp: null,
        // Fills an MF_DiagramFrame in place (its sendGenText routes genflow data).
        fillsComptype: 'MF_DiagramFrame',
        clientDataField: 'generatedflow',
        clientPrompt: 'default',
        clientPromptField: 'category',  // dynamic: uses args.category || clientPrompt
        clientTransform: null,  // null = JSON.stringify(args)
        recipeOutputKeys: ['flowchart', 'sequencediagram']
    },
    {
        mcpToolName: 'render_mindmap',
        // Real-world/current data component: the local agent may web-research first.
        webResearch: true,
        mcpDescription: `Create a mindmap for brainstorming, topic exploration, and hierarchical idea organization.

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
        mcpInputSchema: {
            type: 'object',
            properties: {
                nodeData: {
                    type: 'object',
                    description: 'Root node with id, topic, root=true, and children array. Children have direction (0=left, 1=right)',
                    properties: {
                        id: { type: 'string' },
                        topic: { type: 'string' },
                        image: { type: 'string', description: 'Optional emoji icon for the node (e.g. "💡", "🎯"). Use sparingly on key nodes.' },
                        root: { type: 'boolean' },
                        children: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    topic: { type: 'string' },
                                    image: { type: 'string', description: 'Optional emoji icon for the node (e.g. "💡", "🎯"). Use sparingly on key nodes.' },
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: 'MF_MindMap_ID',
        clientDataField: 'generatedmindmap',
        clientPrompt: 'mindmap',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['mindmap', 'brainstorm']
    },
    {
        mcpToolName: 'render_knowledgegraph',
        // Real-world/current data component: the local agent may web-research first.
        webResearch: true,
        mcpDescription: `Create a knowledge graph (bubble network) showing how concepts relate to each other, like an Obsidian graph view.

STRUCTURE RULES:
- "nodes" array: each node has "id" (unique string like "n1"), "label" (text, can include emojis), "weight" (1-8, higher = more important/larger bubble)
- "edges" array: each edge has "id" (unique string like "e1"), "from" (source node id), "to" (target node id), "label" (relationship description, can be empty)
- Create 5-12 nodes with meaningful labels
- Central concepts: weight 5-8, supporting: 3-4, details: 1-2
- Make the graph connected — avoid isolated nodes

EXAMPLE:
{
  "nodes": [
    { "id": "n1", "label": "🎯 Main Concept", "weight": 6 },
    { "id": "n2", "label": "💡 Sub Topic A", "weight": 4 },
    { "id": "n3", "label": "📊 Sub Topic B", "weight": 3 },
    { "id": "n4", "label": "Detail 1", "weight": 2 }
  ],
  "edges": [
    { "id": "e1", "from": "n1", "to": "n2", "label": "includes" },
    { "id": "e2", "from": "n1", "to": "n3", "label": "relates to" },
    { "id": "e3", "from": "n2", "to": "n4", "label": "specifies" }
  ]
}

IMPORTANT: Always display the returned URL to the user.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                nodes: {
                    type: 'array',
                    description: 'Array of nodes with id, label, and weight (1-8)',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            label: { type: 'string' },
                            weight: { type: 'integer', minimum: 1, maximum: 8 }
                        },
                        required: ['id', 'label', 'weight']
                    }
                },
                edges: {
                    type: 'array',
                    description: 'Array of edges with id, from, to, and label',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            from: { type: 'string' },
                            to: { type: 'string' },
                            label: { type: 'string' }
                        },
                        required: ['id', 'from', 'to']
                    }
                }
            },
            required: ['nodes', 'edges']
        },

        clientAitype: 'gencomp',
        clientComp: 'MF_KnowledgeGraph_ID',
        clientDataField: 'generatedknowledgegraph',
        clientPrompt: 'knowledge graph',
        clientPromptField: null,
        clientTransform: function(args) {
            return JSON.stringify({ nodes: args.nodes, edges: args.edges });
        },
        recipeOutputKeys: ['knowledgegraph']
    },
    {
        mcpToolName: 'render_cloudarchitecture',
        mcpDescription: `Create cloud/software system architecture diagrams for AWS, Azure, GCP, Kubernetes, or network infrastructure. ONLY for technical software/cloud/network diagrams — NOT for physical buildings, construction, or real-world/building architecture. For a hand-drawn "cloud isometric diagram" use render_flowchart (cloud-isometric category) instead.

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
        mcpInputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'A short title for the diagram, shown as the frame header (e.g. "AWS Web App Architecture").'
                },
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencloudarchitecture',
        clientComp: null,
        // Fills an MF_DiagramFrame in place (sendGenText routes cloud-arch data).
        fillsComptype: 'MF_DiagramFrame',
        clientDataField: 'generatedcloudarchitecture',
        clientPrompt: 'aws',
        clientPromptField: 'diagramType',  // dynamic: uses args.diagramType || clientPrompt
        clientTransform: null,
        recipeOutputKeys: ['cloudarchitecturediagram']
    },
    {
        mcpToolName: 'render_chart',
        // Plan-picker badge join key (AI_REGISTRY multiBoardType) for tools whose
        // comptype join misses (pseudo/fills-many comptypes).
        planUIType: 'charts',
        // Real-world/current data component: the local agent may web-research first.
        webResearch: true,
        mcpDescription: `Create charts including pie, bar, line, area, scatter, bubble, and radar charts.

CRITICAL: SINGLE-SERIES vs MULTI-SERIES DATA FORMATS:

For SINGLE series (one line/area/bar over many categories):
Format: "Legends,SeriesName\\nCategory1,Value1\\nCategory2,Value2\\nCategory3,Value3"
Example: Monthly snowfall → "Legends,Avg Snowfall (in)\\nJan,9.1\\nFeb,9.4\\nMar,5.2"

For MULTIPLE series (multiple lines/areas/bars):
Format: "Legends,Cat1,Cat2,Cat3\\nSeries1,Val1,Val2,Val3\\nSeries2,Val1,Val2,Val3"
Example: Sales vs Costs → "Legends,Q1,Q2,Q3\\nSales,100,120,150\\nCosts,60,70,80"

CHART TYPES & DATA FORMATS:

| Type | componentType | Data Format |
|------|---------------|-------------|
| Pie | MF_PieChart2 | "Label1,Label2\\n20,30" |
| Line | MF_HorizontalLineChart | Single: "Legends,SeriesName\\nJan,100\\nFeb,120" Multi: "Legends,Jan,Feb\\nSeries1,100,120\\nSeries2,60,70" |
| Vertical Bar | MF_VerticalBarChart | Single: "Legends,SeriesName\\nCat1,45\\nCat2,50" Multi: "Legends,Q1,Q2\\nProduct A,45,50" |
| Horizontal Bar | MF_HorizontalBarChart | Same as vertical |
| Area | MF_AreaChart | Same as line. For 6+ time periods, use SINGLE series format |
| Scatter | MF_ScatterChart | "Label,X,Y\\nPoint1,14,125" |
| Bubble | MF_BubbleChart | "Labels,x,y,r\\nPlot1,14,125,4" |
| Radar | MF_RadarChart | "Legends,Axis1,Axis2\\nSeries,8,9" (always multi-series) |

DATA FORMAT RULES:
- Use CSV format with \\n for newlines
- First row contains labels/legends
- Subsequent rows contain data values
- Labels can include units in parentheses: "Revenue ($M)", "Users (K)", "Speed (mph)" but data values must be pure numbers
- Do NOT use emojis in chartData labels or values - only use plain text
- For data over 6+ time periods (months, weeks, days), use SINGLE series format
- Choose the most appropriate chart type based on data nature

IMPORTANT: Always display the returned URL to the user.`,
        mcpInputSchema: {
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: null,  // dynamic: uses args.componentType
        // Fills any of the 8 chart components in place (the agent pins componentType
        // to the edited component's type; each chart class has a matching sendGenText).
        fillsComptypes: ['MF_PieChart2', 'MF_HorizontalLineChart', 'MF_VerticalBarChart', 'MF_HorizontalBarChart', 'MF_AreaChart', 'MF_ScatterChart', 'MF_BubbleChart', 'MF_RadarChart'],
        clientDataField: 'generatedcharts',
        clientPrompt: 'chart',
        clientPromptField: null,
        clientTransform: function(args) {
            // Normalize literal \n (backslash+n) to actual newline characters.
            // LLMs may send \\n in JSON which becomes literal \n after parse,
            // but the chart CSV parser expects real newlines to split rows.
            var rawData = args.chartData || '';
            rawData = rawData.replace(/\\n/g, '\n');
            var chartdata = {
                data: rawData,
                title: args.title || ''
            };
            if (args.chartColors && args.chartColors.length > 0) {
                chartdata.chartColors = args.chartColors;
            }
            return {
                comp: args.componentType || 'MF_VerticalBarChart',
                charts: true,
                dataValue: JSON.stringify(chartdata)
            };
        },
        recipeOutputKeys: ['areachart', 'bubblechart', 'horizontalbarchart', 'horizontallinechart', 'piechart', 'radarchart', 'scatterchart', 'verticalbarchart']
    },
    {
        mcpToolName: 'render_table',
        // Real-world/current data component: the local agent may web-research first.
        webResearch: true,
        mcpDescription: `Create data tables and grids from CSV-formatted data — structured rows/columns for display (rosters, comparison tables, inventories, directories). NOT for spreadsheets needing formulas or calculations (use render_spreadsheet); NOT for strategy/brainstorming matrices like RACI, Eisenhower, BCG, Ansoff, priority or segmentation matrices (use render_whiteboard).

FORMAT RULES:
- First row = headers (column names)
- Data rows follow, separated by \\n
- Values separated by commas
- Wrap values containing commas in double quotes
- 5-15 data rows typical

EXAMPLE (note the placeholder values - do not invent real-looking names or contact details):
"Name,Email,Phone\\nGuest 1,person1@example.com,555-0100\\nGuest 2,person2@example.com,555-0101"

IMPORTANT: Always display the returned URL to the user.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                data: {
                    type: 'string',
                    description: 'CSV-formatted data. First row is headers, subsequent rows are data. Use placeholder values for details the user did not provide. Example: "Name,Email,Phone\\nGuest 1,person1@example.com,555-0100"'
                }
            },
            required: ['data']
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: 'MF_AdvancedDataGrid',
        clientDataField: 'generatedadvanceddatagrid',
        clientPrompt: 'table',
        clientPromptField: null,
        clientTransform: function(args) {
            return (args.data || '').replace(/\\n/g, '\n');
        },
        recipeOutputKeys: ['table']
    },
    {
        mcpToolName: 'render_markdown',
        imageSlots: true,
        imageSlotForm: 'url',
        imagesOnGuidance: `THIS RENDER INCLUDES AI-GENERATED IMAGERY.
- Add an image tag to the sections that genuinely benefit from a visual, written as ![alt text](prompt:: "what the picture shows").
- Describe only visuals - no text, letters, labels or numbers inside the picture.
- Give every image the same style suffix so the document reads as one piece.`,
        imagesOffGuidance: `THIS RENDER HAS NO IMAGERY - write the document with no image tags at all.`,
        mcpDescription: `Create markdown documents with headings, paragraphs, lists, and AI-generated images.

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
ONLY when you have been told this render includes images. Otherwise write the document with no image tags at all.
When it does, include image tags with descriptive prompts where a visual genuinely helps:
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
        mcpInputSchema: {
            type: 'object',
            properties: {
                content: {
                    type: 'string',
                    description: 'Markdown content. Use standard markdown syntax. For AI-generated images, use: ![alt](prompt:: "description")'
                }
            },
            required: ['content']
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: 'MF_Markdown2_ID',
        clientDataField: 'generatedDoc',
        clientPrompt: 'doc',
        clientPromptField: null,
        clientTransform: function(args) {
            return {
                dataValue: args.content || '',
                extraFields: { generatedDoc: args.content || '' }
            };
        },
        recipeOutputKeys: ['markdown']
    },
    {
        mcpToolName: 'render_codeblock',
        mcpDescription: `Create a syntax-highlighted code block from a snippet of source code.

USE THIS FOR: functions, classes, scripts, algorithms, SQL queries, regex, config files, or any "write the code for..." / "show me a function" request. NOT for prose documents (use render_markdown).

RULES:
- code: the raw source code. Preserve newlines and indentation exactly.
- language: the programming language in lowercase (e.g. "javascript", "python", "java", "sql", "bash", "json", "typescript", "go"). Drives syntax highlighting.
- title: a short title for the code block's title bar (e.g. "Bubble Sort", "Fetch Users Query").

IMPORTANT: Always display the returned URL to the user.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                code: {
                    type: 'string',
                    description: 'Raw source code. Preserve newlines and indentation exactly.'
                },
                language: {
                    type: 'string',
                    description: 'Programming language, lowercase (e.g. "javascript", "python", "sql", "bash")'
                },
                title: {
                    type: 'string',
                    description: 'Short title for the code block title bar (e.g. "Bubble Sort")'
                }
            },
            required: ['code']
        },

        // Client-side rendering (showResults gdata mapping). MF_CodeBlock_ID.sendGenText reads
        // the code + language + title from the TOP level of gentext (like render_markdown), so
        // surface them via extraFields (not extraDataFields).
        clientAitype: 'gencomp',
        clientComp: 'MF_CodeBlock_ID',
        clientDataField: 'generatedDoc',
        clientPrompt: 'code',
        clientPromptField: null,
        clientTransform: function(args) {
            // Resolve the language NAME to the {lang,ext} JSON string the CodeBlock
            // iframe JSON.parses. A raw name like "python" would make its JSON.parse throw.
            var LANG_MAP = {"javascript":'{"lang": "javascript", "ext": "js"}',"js":'{"lang": "javascript", "ext": "js"}',"node":'{"lang": "javascript", "ext": "js"}',"nodejs":'{"lang": "javascript", "ext": "js"}',"python":'{"lang": "python", "ext": "py"}',"py":'{"lang": "python", "ext": "py"}',"java":'{"lang": "clike", "ext": "java"}',"c++":'{"lang": "clike", "ext": "cpp"}',"cpp":'{"lang": "clike", "ext": "cpp"}',"c":'{"lang": "clike", "ext": "c"}',"c#":'{"lang": "clike", "ext": "cs"}',"csharp":'{"lang": "clike", "ext": "cs"}',"cs":'{"lang": "clike", "ext": "cs"}',"php":'{"lang": "php", "ext": "php"}',"ruby":'{"lang": "ruby", "ext": "rb"}',"rb":'{"lang": "ruby", "ext": "rb"}',"go":'{"lang": "go", "ext": "go"}',"golang":'{"lang": "go", "ext": "go"}',"rust":'{"lang": "rust", "ext": "rs"}',"rs":'{"lang": "rust", "ext": "rs"}',"swift":'{"lang": "swift", "ext": "swift"}',"kotlin":'{"lang": "clike", "ext": "kt"}',"kt":'{"lang": "clike", "ext": "kt"}',"typescript":'{"lang": "javascript", "ext": "ts"}',"ts":'{"lang": "javascript", "ext": "ts"}',"jsx":'{"lang": "jsx", "ext": "jsx"}',"tsx":'{"lang": "jsx", "ext": "jsx"}',"vue":'{"lang": "vue", "ext": "vue"}',"html":'{"lang": "xml", "ext": "html"}',"css":'{"lang": "css", "ext": "css"}',"scss":'{"lang": "sass", "ext": "scss"}',"sass":'{"lang": "sass", "ext": "scss"}',"less":'{"lang": "css", "ext": "less"}',"sql":'{"lang": "sql", "ext": "sql"}',"mysql":'{"lang": "sql", "ext": "sql"}',"postgresql":'{"lang": "sql", "ext": "sql"}',"postgres":'{"lang": "sql", "ext": "sql"}',"shell":'{"lang": "shell", "ext": "sh"}',"bash":'{"lang": "shell", "ext": "sh"}',"sh":'{"lang": "shell", "ext": "sh"}',"zsh":'{"lang": "shell", "ext": "sh"}',"powershell":'{"lang": "powershell", "ext": "ps1"}',"ps1":'{"lang": "powershell", "ext": "ps1"}',"dockerfile":'{"lang": "dockerfile", "ext": "dockerfile"}',"docker":'{"lang": "dockerfile", "ext": "dockerfile"}',"yaml":'{"lang": "yaml", "ext": "yml"}',"yml":'{"lang": "yaml", "ext": "yml"}',"toml":'{"lang": "toml", "ext": "toml"}',"json":'{"lang": "javascript", "ext": "json"}',"xml":'{"lang": "xml", "ext": "xml"}',"markdown":'{"lang": "markdown", "ext": "md"}',"md":'{"lang": "markdown", "ext": "md"}',"latex":'{"lang": "stex", "ext": "tex"}',"tex":'{"lang": "stex", "ext": "tex"}',"r":'{"lang": "r", "ext": "r"}',"matlab":'{"lang": "octave", "ext": "m"}',"octave":'{"lang": "octave", "ext": "m"}',"scala":'{"lang": "clike", "ext": "scala"}',"clojure":'{"lang": "clojure", "ext": "clj"}',"clj":'{"lang": "clojure", "ext": "clj"}',"haskell":'{"lang": "haskell", "ext": "hs"}',"hs":'{"lang": "haskell", "ext": "hs"}',"erlang":'{"lang": "erlang", "ext": "erl"}',"elixir":'{"lang": "erlang", "ext": "ex"}',"ex":'{"lang": "erlang", "ext": "ex"}',"dart":'{"lang": "dart", "ext": "dart"}',"lua":'{"lang": "lua", "ext": "lua"}',"perl":'{"lang": "perl", "ext": "pl"}',"pl":'{"lang": "perl", "ext": "pl"}',"pascal":'{"lang": "pascal", "ext": "pas"}',"fortran":'{"lang": "fortran", "ext": "f90"}',"cobol":'{"lang": "cobol", "ext": "cob"}',"groovy":'{"lang": "groovy", "ext": "groovy"}',"coffeescript":'{"lang": "coffeescript", "ext": "coffee"}',"coffee":'{"lang": "coffeescript", "ext": "coffee"}',"stylus":'{"lang": "stylus", "ext": "styl"}',"pug":'{"lang": "pug", "ext": "pug"}',"haml":'{"lang": "haml", "ext": "haml"}',"handlebars":'{"lang": "handlebars", "ext": "hbs"}',"twig":'{"lang": "twig", "ext": "twig"}',"nginx":'{"lang": "nginx", "ext": "conf"}',"ini":'{"lang": "properties", "ext": "ini"}',"properties":'{"lang": "properties", "ext": "properties"}',"diff":'{"lang": "diff", "ext": "diff"}',"git":'{"lang": "shell", "ext": "gitignore"}',"plaintext":'{"lang": "javascript", "ext": "js"}',"text":'{"lang": "javascript", "ext": "js"}'};
            var key = ('' + (args.language || '')).toLowerCase().trim();
            if (key.charAt(0) === '.') key = key.substring(1);
            var codeLanguage = LANG_MAP[key] || '{"lang": "javascript", "ext": "js"}';
            return {
                dataValue: args.code || '',
                extraFields: {
                    generatedDoc: args.code || '',
                    codeLanguage: codeLanguage,
                    codeTitle: args.title || 'Code'
                }
            };
        },
        recipeOutputKeys: ['codeblock']
    },
    {
        mcpToolName: 'render_map',
        // Real-world/current data component: the local agent may web-research first.
        webResearch: true,
        mcpDescription: `Create maps with location markers (pins) for plotting SPECIFIC INDIVIDUAL PLACES on a real-world map.

USE THIS FOR: discrete points you could drop a pin on — addresses, business/office/store locations, venues, landmarks, tourist attractions, travel/route stops.
DO NOT USE THIS FOR ranking, comparing, or shading whole countries/states/continents/regions by a value or category — that is a choropleth: use render_mapregions instead (e.g. "population by country", "US states by income", "top countries by X", "EU members", "driving side by country").
DO NOT USE THIS to DRAW a plan over the map — zones, coverage areas, route arrows, territory sketches: use render_strategymap for that.
Each location is geocoded to real Earth coordinates, so DO NOT use this for fictional, imaginary, or invented places (fantasy game worlds, novel settings, made-up countries/cities) — use an image or whiteboard for those.

MOST IMPORTANT RULE — GEOGRAPHIC LEVEL MATCHING:
- You MUST match the geographic granularity the user asked for.
- Country-level prompts (countries, nations, states, regions): use ONLY country names (e.g., "China", "India", "Brazil"). NEVER use city names.
- City-level prompts (cities, towns, metros): use city names with state/country (e.g., "San Francisco, CA", "Paris, France").
- Specific places (restaurants, offices, landmarks): use the most specific name available.

TITLE:
- title: A short descriptive title for the map (e.g., "Top Tech Hubs", "Most Populated Countries")

MARKER PROPERTIES:
- location: Searchable location name (see geographic level rules above)
- description: Brief description of what this location represents
- emoji: Single emoji that represents the context/theme of ALL locations
- geo (OPTIONAL fallback - only for well-known places; the server geocoder resolves the name):
  - coordinates: [longitude, latitude] - LONGITUDE FIRST!
  - name: Formatted location name

CRITICAL COORDINATE RULE:
- coordinates: [LONGITUDE, LATITUDE] - longitude comes FIRST!
- Example: New York is [-74.0060, 40.7128] (not [40.7128, -74.0060])

EMOJI GUIDELINES:
- Choose ONE emoji that best represents the context/theme of ALL locations
- Good choices: 📍🏠🏢🏪🏨🏥🏫🍽️☕⛽🚗✈️🚉🏦💰🎭🎬🏛️🌳🏖️⭐🎯🔴🟢
- Examples: For "hotel locations" use 🏨 for all, for "restaurants" use 🍽️ for all, for "offices" use 🏢 for all

CONTENT GUIDELINES:
- Create 3-8 relevant locations based on the topic
- Ensure descriptions are concise but informative (20-60 characters)

EXAMPLE — COUNTRY-LEVEL (e.g. "top populated countries"):
{
  "title": "Most Populated Countries",
  "markers": [
    {
      "location": "China",
      "description": "World's most populous nation",
      "emoji": "🌍",
      "geo": { "coordinates": [104.1954, 35.8617], "name": "China" }
    }
  ]
}

EXAMPLE — CITY-LEVEL (e.g. "company office locations"):
{
  "title": "Company Office Locations",
  "markers": [
    {
      "location": "New York, NY",
      "description": "Headquarters and main office",
      "emoji": "🏢",
      "geo": { "coordinates": [-74.0060, 40.7128], "name": "New York, NY, USA" }
    }
  ]
}

IMPORTANT: Always display the returned URL to the user.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Short descriptive title for the map (e.g., "Top Tech Hubs", "Most Populated Countries")'
                },
                markers: {
                    type: 'array',
                    description: 'Array of location markers',
                    items: {
                        type: 'object',
                        properties: {
                            location: { type: 'string', description: 'Location name — use country names for country-level prompts, city names for city-level prompts' },
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: 'MF_Maps_ID',
        clientDataField: 'generatedmaps',
        clientPrompt: 'map',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['maps']
    },
    {
        mcpToolName: 'render_mapregions',
        // Real-world/current data component: the local agent may web-research first.
        webResearch: true,
        mcpDescription: `Create a CHOROPLETH map — a real-world map where whole geographic AREAS (countries, states, provinces, continents, world regions) are FILLED with color to encode a value or category.

USE THIS FOR any ranking, comparison, or data-by-area across places: "population by country", "US states by income", "top countries by X", "EU member states", "US states by time zone", "driving side by country", heatmaps by country/state.
DO NOT USE THIS to drop pins on individual places (addresses, offices, venues) — use render_map for that. It fills only OFFICIAL admin boundaries — freeform drawn territories, zones, coverage areas or route plans are render_strategymap instead. It colors real Earth boundaries, so DO NOT use it for fictional or invented regions.

PICK ONE GEOGRAPHIC LEVEL and use it for every region:
- "continent": whole continents
- "region": UN sub-regions / macro-regions (e.g. "Western Europe", "Southern Asia", "Caribbean")
- "country": whole countries
- "state": states / provinces within one country

COLOR MODES:
- "gradient" (value maps: one quantity per region — population, GDP, temperature): set ONE "paletteColor" scheme and give every region a numeric "value". Do NOT set per-region "color". Named schemes: "Blues", "Greens", "Reds", "Oranges", "Purples", "Greys", "YlOrRd", "YlGnBu", "Viridis", "RdBu". Match hue to meaning (Greens=growth/nature, Blues/YlGnBu=water/cold, Reds/YlOrRd=heat/intensity, RdBu=above/below, Viridis=general default).
- "categorical" (discrete groups): give each category ONE consistent "color"; OMIT paletteColor.

REGION PROPERTIES:
- name: region's common English name (for "state" level, the plain state name e.g. "California", "Bavaria")
- iso: STRONGLY PREFERRED for exact matching — country level ISO 3166-1 alpha-3 ("FRA", "BRA", "JPN"); state level ISO 3166-2 ("US-CA", "IN-MH"); omit for continent/region levels
- color: hex "#RRGGBB" fill (categorical maps only)
- value: number (gradient maps only)
- category: discrete group label (categorical maps)
- description: OPTIONAL short note shown on click (<= 80 chars)

LEGEND: array of { label, color } that explains the fills. Labels must match the colors exactly.

IMPORTANT: Always display the returned URL to the user.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Short descriptive title (e.g. "Population by Country", "US States by Time Zone")'
                },
                level: {
                    type: 'string',
                    enum: ['continent', 'region', 'country', 'state'],
                    description: 'The single geographic level used for every region'
                },
                colorMode: {
                    type: 'string',
                    enum: ['categorical', 'gradient'],
                    description: '"gradient" for a value scale (use paletteColor + value), "categorical" for discrete groups (use per-region color)'
                },
                paletteColor: {
                    type: 'string',
                    description: 'For gradient/value maps only: a named color scheme (Blues, Greens, Reds, Oranges, Purples, Greys, YlOrRd, YlGnBu, Viridis, RdBu) or a hex color. Omit for categorical maps.'
                },
                regions: {
                    type: 'array',
                    description: 'Array of region objects to color',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: "Region's common English name" },
                            iso: { type: 'string', description: 'ISO code — alpha-3 for country level, ISO 3166-2 for state level; omit for continent/region levels' },
                            color: { type: 'string', description: 'Hex fill color "#RRGGBB" (categorical maps)' },
                            value: { type: 'number', description: 'Underlying metric (gradient maps)' },
                            category: { type: 'string', description: 'Discrete group label (categorical maps)' },
                            description: { type: 'string', description: 'Optional short note (<= 80 chars)' }
                        },
                        required: ['name']
                    }
                },
                legend: {
                    type: 'array',
                    description: 'Key explaining the colors',
                    items: {
                        type: 'object',
                        properties: {
                            label: { type: 'string' },
                            color: { type: 'string', description: 'Hex "#RRGGBB"' }
                        }
                    }
                }
            },
            required: ['regions']
        },

        // Client-side rendering (showResults gdata mapping). MF_MapRegions_ID.sendGenText reads
        // JSON.parse(gentext.data.generatedmapregions), so a null transform (which stringifies the
        // whole args object into that field) is exactly right — same pattern as render_map.
        clientAitype: 'gencomp',
        clientComp: 'MF_MapRegions_ID',
        clientDataField: 'generatedmapregions',
        clientPrompt: 'mapregions',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['mapregions']
    },
    {
        mcpToolName: 'render_strategymap',
        // Real-world/current data component: the local agent may web-research first.
        webResearch: true,
        mcpDescription: `Create a STRATEGY MAP — a plan DRAWN ON a real-world map: zones, coverage circles, route arrows, markers and short text notes over real geography.

USE THIS FOR spatial plans: sales territories to carve, delivery/expansion routes, event site plans, evacuation/operations plans, coverage areas, military-style overlays — whenever the subject is a PLAN or ANNOTATION over space.
DO NOT USE THIS to plot plain point locations (addresses, offices, venues) — use render_map. DO NOT use it to shade whole countries/states by a statistic or category — use render_mapregions. It draws on the real Earth, so DO NOT use it for fictional or invented places.

MOST IMPORTANT RULE — every shape is anchored to REAL Earth coordinates as [longitude, latitude] (LONGITUDE FIRST). Use accurate coordinates for the places the plan refers to.

SHAPE TYPES ("coordinates" shape depends on type):
- "zone": array of [lng,lat] vertices (3-16) tracing the area's outline; do NOT repeat the first point at the end
- "circle": single [lng,lat] center; REQUIRES "radiusKm" sized to what it represents (a district is a few km, regional reach can be hundreds)
- "arrow": array of [lng,lat] points (2-8) from origin to destination; arrowhead drawn at the LAST point; route through sensible intermediate points when the path matters
- "marker": single [lng,lat] point
- "text": single [lng,lat] point; "label" is its content

SHAPE PROPERTIES:
- color: hex "#RRGGBB" — use color to GROUP related shapes: one side/team/phase shares one color, opposing elements get a clearly different one
- label: OPTIONAL short name (a few words). Label only shapes whose meaning is not obvious — a few well-chosen labels, never one on every shape, never several crowding one small area
- emoji: for "marker": ONE emoji depicting what the marker actually IS (asset, place, unit, event) — never a generic pin when something more specific exists; same kind = same emoji, different kinds = visibly different
- dash: OPTIONAL boolean for zones/circles/arrows — true renders the outline dashed; use for planned/proposed/tentative vs confirmed

CONTENT GUIDELINES:
- Draw the PLAN, not just locations: areas that matter (zones/circles), what moves where (arrows), what sits where (markers). A good map mixes several shape types.
- Keep it readable: roughly 4-20 shapes. Use "text" notes sparingly and never to repeat a label. The map's name goes in "title" only.

EXAMPLE:
{
  "title": "Berlin Delivery Coverage Plan",
  "shapes": [
    { "type": "circle", "coordinates": [13.405, 52.52], "radiusKm": 6, "color": "#1c7ce2", "label": "Central coverage" },
    { "type": "zone", "coordinates": [[13.29,52.54],[13.34,52.57],[13.41,52.56],[13.38,52.51],[13.31,52.50]], "color": "#10b981", "label": "Phase 2 area", "dash": true },
    { "type": "marker", "coordinates": [13.365, 52.525], "emoji": "🏭", "color": "#f59e0b", "label": "Depot" },
    { "type": "arrow", "coordinates": [[13.365,52.525],[13.42,52.50],[13.46,52.48]], "color": "#ef4444", "label": "Route east" }
  ]
}

IMPORTANT: Always display the returned URL to the user.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Short descriptive title for the plan (e.g. "West Coast Expansion Plan") — displayed on the map'
                },
                shapes: {
                    type: 'array',
                    description: 'Array of shapes drawn on the map',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['zone', 'circle', 'arrow', 'marker', 'text'], description: 'Shape kind' },
                            coordinates: { type: 'array', description: 'zone/arrow: array of [lng,lat] points; circle/marker/text: single [lng,lat] — LONGITUDE FIRST' },
                            radiusKm: { type: 'number', description: 'Circle radius in kilometers (REQUIRED for "circle")' },
                            color: { type: 'string', description: 'Hex "#RRGGBB"; same color groups shapes of one side/team/phase' },
                            label: { type: 'string', description: 'Optional short name; label sparingly. For "text" shapes this is the content' },
                            emoji: { type: 'string', description: 'For "marker": one emoji depicting what the marker IS (not a generic pin)' },
                            dash: { type: 'boolean', description: 'Dashed outline for planned/proposed/tentative elements' }
                        },
                        required: ['type', 'coordinates']
                    }
                }
            },
            required: ['shapes']
        },

        // Client-side rendering (showResults gdata mapping). MF_StrategyMap_ID.sendGenText reads
        // JSON.parse(gentext.data.generatedstrategymap), so a null transform (which stringifies the
        // whole args object into that field) is exactly right — same pattern as render_map.
        clientAitype: 'gencomp',
        clientComp: 'MF_StrategyMap_ID',
        clientDataField: 'generatedstrategymap',
        clientPrompt: 'strategymap',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['strategymap']
    },
    {
        mcpToolName: 'render_spreadsheet',
        // Real-world/current data component: the local agent may web-research first.
        webResearch: true,
        mcpDescription: `Create spreadsheets with cell data, formulas, and formatting.

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

EXAMPLE (the labels and figures below are PLACEHOLDERS - keep values generic unless the user gave you real ones):
{
  "cellData": "{\\"A1\\":\\"Product\\",\\"B1\\":\\"Price\\",\\"C1\\":\\"Qty\\",\\"D1\\":\\"Total\\",\\"A2\\":\\"Item 1\\",\\"B2\\":\\"25\\",\\"C2\\":\\"10\\",\\"D2\\":\\"=B2*C2\\",\\"A3\\":\\"Total\\",\\"D3\\":\\"=SUM(D2:D2)\\"}",
  "formulas": "{\\"D2\\":\\"=B2*C2\\",\\"D3\\":\\"=SUM(D2:D2)\\"}",
  "rows": 3,
  "cols": 4,
  "formatting": "{\\"A1\\":{\\"fontWeight\\":\\"bold\\"},\\"B1\\":{\\"fontWeight\\":\\"bold\\"},\\"C1\\":{\\"fontWeight\\":\\"bold\\"},\\"D1\\":{\\"fontWeight\\":\\"bold\\"}}"
}

IMPORTANT: Always display the returned URL to the user.`,
        mcpInputSchema: {
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
                },
                cellFormats: {
                    type: 'string',
                    description: 'JSON string mapping cells to a display format: "number", "currency", "percentage", or "date". e.g. {"B2":"number","C2":"currency"}. Use for numeric/money/percent/date columns.'
                },
                cellFormatOptions: {
                    type: 'string',
                    description: 'JSON string of per-cell format options: {"B2":{"decimals":2},"C2":{"currency":"USD","decimals":2}}. Pairs with cellFormats.'
                }
            },
            required: ['cellData', 'rows', 'cols']
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: 'MF_Spreadsheet_ID',
        clientDataField: 'generatedtext',
        clientPrompt: 'spreadsheet',
        clientPromptField: null,
        clientTransform: function(args) {
            function pj(s, d) { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } }
            var spreadsheetData = {
                data: pj(args.cellData, {}),
                formulas: pj(args.formulas, {}),
                rows: args.rows || 10,
                cols: args.cols || 5,
                formatting: pj(args.formatting, {}),
                cellFormats: pj(args.cellFormats, {}),
                cellFormatOptions: pj(args.cellFormatOptions, {})
            };
            return JSON.stringify(spreadsheetData);
        },
        recipeOutputKeys: ['spreadsheet']
    },
    {
        mcpToolName: 'render_whiteboard',
        // Plan-picker badge join key (AI_REGISTRY multiBoardType) for tools whose
        // comptype join misses (pseudo/fills-many comptypes).
        planUIType: 'whiteboard',
        mcpDescription: `Create whiteboards for freeform brainstorming AND structured strategy work: sticky notes and sections, named frameworks (SWOT, SCAMPER, Six Thinking Hats, Fishbone, empathy maps, Lean/Business Model Canvas, retrospectives, priority/RACI/Eisenhower matrices), and mood / inspiration boards (style boards, aesthetic collections, color-palette references). NOT for kanban-style status columns (use render_kanban) or UI/screen mockups and wireframes (use render_wireframelite).

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

GEOMETRY (your x/y/w/h are used verbatim, so author a finished canvas):
- Coordinates are canvas-relative and start at 0,0.
- Choose a canvas size for the activity and keep EVERY component fully inside it: no part of any component (x, y, x+w, y+h) may fall outside the canvas. Typical sizes: small brainstorm 1200x800, medium brainstorm 1600x1200, large workshop 2000x1400, timeline/process 2400x900, mind map 1500x1200, project planning 1800x1200.
- Do NOT overlap components: a note belongs beside its siblings inside its section's bounds, never on top of one. Lay the sections out on a grid before emitting JSON.
- SIZE TEXT TO ITS CONTENT. Text that does not fit its w/h is auto-shrunk on the board (down to 5px), so a long note in a small box renders unreadably small. Budget about fs * 1.6 of height per line and enough width for the longest line plus padding. Section titles 16-24, note text 12-16.

IMPORTANT: Always display the returned URL to the user.`,
        mcpInputSchema: {
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
                                    tx: { type: 'string', description: 'Text content: the note, the label, the section title' },
                                    ta: { type: 'string', enum: ['left', 'center', 'right', 'justify'] },
                                    fs: { type: 'number', description: 'REQUIRED on anything with text. Font size in px: section titles 16-24, note text 12-16, board headings larger. Omit it and every word renders at the same default size.' },
                                    fcl: { type: 'string', description: 'Font colour, hex - dark text on a light sticky, light on a dark section' },
                                    fw: { type: 'string', enum: ['normal', 'bold', '200', '300', '600', '900'] },
                                    fst: { type: 'string', enum: ['normal', 'italic'] },
                                    td: { type: 'string', enum: ['none', 'underline', 'line-through'] },
                                    fnt: { type: 'string', description: 'REQUIRED on anything with text. A Google Font family name; keep to one or two across the board.' },
                                    lh: { type: 'number', description: 'Line height multiplier, 1.2-1.5 keeps notes readable' },
                                    tp: { type: 'number', description: 'MF_Note2: padding inside the sticky, 8-15' },
                                    fold: { type: 'boolean', description: 'MF_Note2: the folded-corner effect' },
                                    fc: { type: 'array', items: { type: 'string' }, description: 'Fill colours [from, to] - sticky colours like ["#fbf4a4","#fbf4a4"], pastel sections' },
                                    ft: { type: 'string', enum: ['solid', 'linear-vertical', 'linear-horizontal', 'linear-diagonally', 'radial', 'none'] },
                                    fa: { type: 'number', description: 'Fill opacity 0-1' },
                                    st: { type: 'string', description: 'Shadow: none | drop-shadow | inner-shadow | glow (a soft drop shadow suits notes)' },
                                    br: { type: 'array', items: { type: 'number' }, description: 'Corner radii [all, tl, tr, br, bl]' },
                                    bw: { type: 'array', items: { type: 'number' }, description: 'Border widths [all, top, right, bottom, left]' },
                                    bt: { type: 'array', items: { type: 'string' }, description: 'Border types [all, top, right, bottom, left]' },
                                    bc: { type: 'array', items: { type: 'string' }, description: 'Border colours [all, top, right, bottom, left]' }
                                }
                            }
                        }
                    }
                }
            },
            required: ['components']
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'genwhiteboard',
        clientComp: null,
        clientDataField: 'generatedwhiteboard',
        clientPrompt: 'whiteboard',
        clientPromptField: null,
        clientTransform: function(args) {
            var s = '';
            try {
                s = JSON.stringify(args.components || args);
            } catch (e) {}
            // initoffset mirrors genwhiteboard: the layout's coordinates are canvas-relative,
            // so the client (optimizer.generateLayout) must translate them by the board's
            // init offset. Without it the components are created at raw canvas coordinates
            // near the board origin instead of in the board's free area.
            return {
                dataValue: s,
                extraDataFields: { isCompressed: true, initoffset: true, generatedui: s }
            };
        },
        recipeOutputKeys: ['whiteboard', 'moodboard']
    },
    {
        // WireframeLite — a lightweight UI wireframe frame (MF_WireframeLite_ID). Its
        // HTML→paintObjects conversion is a custom client flow, so mapToolToGdata returns
        // null (signalled by clientIsHtmlConversion) rather than the generic mapping.
        mcpToolName: 'render_wireframelite',
        // WHEN to pick this, for the bridge's deciding step, which sees this line and
        // nothing else. Carries the same rule the server classifier uses (the wireframe
        // detectionPromptDescription plus its multiBoardIntentHint): a UI request with no
        // interactive wording is a wireframe, and one screen is one component, so a whole
        // product is a plan. Kept apart from mcpDescription for the same reason the server
        // keeps classification apart from generation - that prompt has to open with the
        // markup contract, and read as a decision it says only "convert HTML to a wireframe".
        mcpDeclareLine: 'A static UI wireframe/mockup screen, and the DEFAULT for any UI request that carries no interactive wording. ONE screen is one component, so a whole app, site, dashboard or product flow is SEVERAL screens: declare "plan" for those, not this.',
        imageSlots: true,
        imageSlotForm: 'url',
        imagesOnGuidance: `THIS RENDER INCLUDES AI-GENERATED IMAGERY.
- Write each photo slot as <img src="" data-ai-prompt="what the picture shows" data-img-width="W" data-img-height="H" style="width:Wpx;height:Hpx;object-fit:cover;">, at most 5 DISTINCT pictures per screen. In HTML this attribute form is the ONLY one: it is what carries the size, and a slot written any other way is generated at the full default size and charged for it.
- DESCRIBE THE SUBJECT THE SLOT DEPICTS. A slot always sits where the interface is showing the user some specific thing; read what that thing is off its surroundings - the labels beside it, the section it belongs to, what the screen is for - and write the prompt as a photograph of it, concrete enough to be recognisable. A slot described as an abstract shape, a gradient, or as a "placeholder" produces exactly that: a picture of nothing, sitting where the screen meant to show something.
- A PICTURE THAT RECURS IS NAMED, NOT RE-DESCRIBED. Any subject that appears more than once - within this screen or on any other screen of the same app in this request - carries data-shared-asset="<key>" beside its prompt: <img src="" data-shared-asset="brand_logo" data-ai-prompt="..." data-img-width="W" data-img-height="H" style="...">. Everything sharing a key is generated ONCE and the same picture is used everywhere it appears, so the brand mark stays one mark and a named person stays one face instead of becoming a different one per screen. The key is what identifies it, so the wording beside it does not have to match. Keys are stable, lowercase and snake_case, and describe WHO or WHAT rather than where it sits, so screens written separately arrive at the same key for the same thing: the brand mark is always brand_logo; a named person is avatar_<their first name>; a recurring item of the app's main entity is <entity>_<n>. Leave the key off a picture that genuinely appears once and nowhere else.
- Same boxes, same layout, same text sizes as the screen would have had without them - only the box contents change.
- ICONS ARE NEVER IMAGES: they stay FontAwesome SVG <img> tags, or you get a photo where an icon belongs.
- CHARTS ARE NEVER IMAGES: a data visual stays a real Chart.js <canvas> per the CHARTS rules, or you get a picture of a chart the user cannot edit.`,
        imagesOffGuidance: `THIS RENDER HAS NO IMAGERY.
- Photo/avatar/logo/thumbnail slots are <img src="placeholder" style="width:300px;height:200px;border:1px solid #ccc;"> at the intended size; full-bleed hero/banner backgrounds are a coloured <div>.
- Emit NO data-ai-prompt attributes at all.
- CHARTS ARE NOT IMAGERY: this mode changes nothing about data visuals — they stay real Chart.js <canvas> elements per the CHARTS rules, never placeholder <img> boxes.`,
        mcpDescription: `Convert HTML to an editable UI wireframe inside a MockFlow IdeaBoard wireframe frame.

Provide a complete HTML document with inline CSS styles. The HTML is rendered in a real browser and converted element by element into editable MockFlow components.

READ THIS FIRST — MARKUP CONTRACT. The converter maps real markup onto real MockFlow components. Anything you SIMULATE with other markup arrives as a plain rectangle or a stray text character, so the user gets a broken screen:
1. ICONS: an <img> whose src is a FontAwesome SVG URL (details in ICONS below). A text, unicode or emoji character standing in for an icon is not an icon — it converts to a stray glyph of text, not an icon component.
2. CHARTS: a real Chart.js <canvas> (details in CHARTS below). Bars, arcs, sparklines or gauges built out of styled divs, borders, gradients or CSS shapes are not charts — they convert to a pile of rectangles the user cannot edit as a chart, and the data is lost. A chart is never an image either: an <img> placeholder standing where a chart belongs arrives as an empty picture box, not a chart.
3. IMAGES: an <img> placeholder (details in IMAGES below).
Never hand-draw what the contract already gives you a real element for. A UI screen with zero <img> icons, or a dashboard with zero <canvas>, is almost always a violation of this contract rather than a screen that genuinely has neither.

SCOPE — works for EITHER a full screen OR a single section/widget:
- Full page/screen: a whole app screen, dashboard, or landing page. Use a page-width container (see DEVICE & VIEWPORT below) with a background color.
- Section or widget only: a single UI piece on its own — e.g. a login card, navbar, pricing table, signup form, sidebar, product card, stats row, data table, hero section, or button group. Size the container to the widget's NATURAL size (e.g. a 380px card, a 1280x64 navbar, a 320px sidebar). Do NOT wrap a partial widget in a full-viewport centering flexbox or a full-page background — keep just the widget so the frame hugs its bounds.

DEVICE & VIEWPORT — for a full screen, size and lay out the wireframe for the device the request implies:
- Honor an explicit device word in the request: a mobile/phone app screen → mobile width, a tablet/iPad screen → tablet width, a web/desktop screen → desktop width. "CRM mobile screen" MUST be a mobile-width layout, NOT desktop.
- Give the outermost container that device's viewport width and lay it out to suit it: mobile ~390px (single column, stacked cards, bottom tab bar), tablet ~820px, desktop ~1280px (multi-column, sidebars). NEVER build a desktop-width layout for a mobile screen.
- A mobile screen is a NATIVE app screen, NOT a web page squeezed into a phone width. Lay it out as a real app would: a single column with generous vertical spacing, touch-scale controls (buttons and inputs ~44px tall, full-width), mobile-scale type (titles 24-28px, body 16-17px), cards spanning the full content width with ~16px side padding, one input per row, stat tiles at most 2-up. No sidebars, no multi-column desktop grids, no desktop-density cramming.
- When no device is implied (a generic web app, website, dashboard, or admin panel), default to desktop web (~1280px).
- Multi-screen app (several calls to this tool): keep ONE shared design system across the screens (same brand, colours, fonts, nav/footer chrome) and pass the SAME viewportWidth on every call so all frames come out the same width.

IMPORTANT RULES:
- Use inline styles (style attribute) for all styling — no external stylesheets
- Use standard HTML elements: div, h1-h6, p, input, button, select, textarea, img, ul, li, table, form
- Fill every text slot and metric with realistic sample content: plausible names, labels, numbers, dates and statuses. Never write the literal word "placeholder" as copy, and never leave a value as a bare dash — a KPI tile or list row whose value is missing reads as an empty, broken screen
- Pass a short screen name in "title" — it becomes the frame's title on the board. Name the screen ("Dashboard", "Checkout"), not the request
- Set explicit widths and heights where possible
- Use a clean, structured layout with proper nesting
- Give the outermost container an explicit width and a background color
- Never use position:fixed or position:sticky — every element must sit in normal document flow, or it captures at the wrong place
- Never draw a device frame, phone bezel or browser chrome around the screen, and never draw the device's OS chrome inside it — no status bar (clock, signal, wifi, battery), no home indicator, no keyboard. Output only the app's own interface: a mobile screen starts at the app's header, not the phone's

WIREFRAME STRUCTURE — this is a real UI screen, not a sparse block diagram. A screen that captures as a handful of grey boxes is a FAILED wireframe:
- Compose the screen from clearly delineated SECTIONS, each in its own container: top nav / header bar, distinct content sections, cards/panels grouping related content, forms, lists, and a footer or bottom tab bar where appropriate.
- Build recognizable WIDGETS, not loose text on rectangles: buttons with labels, input fields with labels or placeholders, checkboxes/radios/toggles, dropdowns, tabs, search bars, avatars, badges, table rows, list rows, cards, KPI tiles. Each must read as a standard, self-contained UI control.
- Fill the screen with the real content that screen would show: a dashboard gets a KPI row AND charts AND a data table (plus a sidebar on desktop — on mobile the same content stacks full-width); a list screen gets 5-8 real rows, not 2. Use realistic copy relevant to the screen ("Email", "Sign in", "Overdue invoices"), never lorem ipsum.
- Establish visual hierarchy and consistent spacing on an 8px grid — varied font sizes and weights, even margins, aligned edges. Give every section and widget explicit, sensible dimensions so each captures as its own editable component.
- Size sections to their content: no absurdly tall hero or empty sections.

STYLING / FIDELITY:
- Default (no style, theme, platform, brand or colour named in the request): a clean flat GRAYSCALE wireframe — palette #FFFFFF, #F9FAFB, #F3F4F6, #E5E7EB, #D1D5DB, #9CA3AF, #6B7280, #4B5563, #374151, #1F2937, with no gradients, no shadows and grey buttons (#E5E7EB fill, #374151 text). Structure and density still matter: grayscale does NOT mean sparse.
- When the request names or implies a theme, design system, UI framework, OS/platform, brand look or a colour: honor it — apply that theme's cohesive palette, fonts and component styling (colored fills, accents, and gradients/shadows where the theme calls for them) instead of the grayscale palette. iOS/Apple → Human Interface Guidelines; Android/Material/Google → Material Design 3; "mobile" → modern mobile conventions (bottom nav, cards, touch-friendly spacing).
- Never sketchy or hand-drawn in either mode. Set the page-level background on <body>, section backgrounds on the sections themselves.

ICONS (REQUIRED for any real UI screen — nav items, search, bell, chevrons, avatars, action buttons):
- Every icon MUST be an <img> whose src is a FontAwesome SVG URL: https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/svgs/solid/{name}.svg — these are mapped onto MockFlow's real icon library, so they become editable icon components.
- Colour: ALWAYS append it as a hex fragment (.../solid/home.svg#374151), chosen to contrast the icon's IMMEDIATE background — a light colour for an icon on a dark sidebar, header, card or filled button, a dark one on a light surface. An icon carries no colour of its own, so state it here the same way you decide whether text is readable there. Leave it off only where the icon should simply match the text beside it.
- Naming: the board's icon library is FontAwesome 5, so where v6 renamed an icon, the v5 name resolves most precisely (home, search, cog, file-alt, users, tachometer-alt). A v6-only name is matched as closely as the library allows.
- Give EVERY icon <img> an explicit inline size: style="width:20px;height:20px;object-fit:contain;". An unsized SVG <img> falls back to its natural size (hundreds of px) and wrecks the layout. Typical icon sizes are 16-24px.
- Any other way of putting an icon on the screen fails: inline <svg> code, icon fonts (<i class="fas fa-home">), and text/unicode/emoji characters used as glyphs all convert to nothing or to stray text, leaving holes where the icons should be. Every icon slot on the screen — including inside nav rows, buttons, list rows and stat cards — takes the <img> form above.

IMAGES: by default no imagery is generated - for photo/avatar/logo/thumbnail slots use <img src="placeholder" style="width:300px;height:200px;border:1px solid #ccc;"> with the intended dimensions (a border that suits the surrounding background), and for full-bleed hero/banner backgrounds use a coloured <div> instead. ONLY when you have been told this render includes images, write those photo slots as <img src="" data-ai-prompt="what the picture shows" data-img-width="W" data-img-height="H" style="width:Wpx;height:Hpx;object-fit:cover;"> instead (max 5 per screen). Icons are never images: they always stay FontAwesome SVG <img> tags.

CHARTS (use them whenever the screen is a dashboard, analytics, reporting or metrics screen — they become real, editable MockFlow chart components carrying their data and colours):
1. Add Chart.js v3 in <head>: <script src="https://d20hhedk3h2l88.cloudfront.net/genai/chart.min.js"></script>
2. WRAP every canvas in a container div with an EXPLICIT height and overflow:hidden:
   <div style="position:relative;height:250px;overflow:hidden;"><canvas id="chart1" data-chart-component="true"></canvas></div>
3. data-chart-component="true" on every chart canvas is REQUIRED — without it the canvas captures as an empty rectangle.
4. Initialize each chart in a <script> at the end of <body>, inside a DOMContentLoaded handler, with realistic sample data and maintainAspectRatio:false. Every chart carries plausible non-empty data — an empty dataset renders bare axes on a blank panel. Use Chart.js v3 syntax only (a horizontal bar is type:'bar' with indexAxis:'y'): a config v3 cannot parse throws, and that canvas converts to a blank image instead of a chart.
5. Heights: KPI-card charts 150-200px, dashboard panels 200-300px, large charts max 400px, never above 500px.
6. Pick the type from the context: bar for comparisons, line for trends over time, pie/doughnut for distributions, filled line for cumulative/area, scatter/bubble/radar where they fit.
7. The chart container background must match its surrounding card (do not hardcode white), and legend/label colours must contrast with it.
8. Every data visual on the screen goes through this path — trend panels, KPI sparklines, funnel/pipeline breakdowns, progress and distribution graphics included. If you find yourself expressing values as div widths, heights, borders or gradients, that is a chart: express it as a canvas instead so it stays real data the user can edit.

EXAMPLE (chart in a dashboard card):
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
  <h3 style="margin:0 0 12px;font-size:15px">Revenue</h3>
  <div style="position:relative;height:250px;overflow:hidden;"><canvas id="chart1" data-chart-component="true"></canvas></div>
</div>
<script>
document.addEventListener('DOMContentLoaded', function() {
  new Chart(document.getElementById('chart1').getContext('2d'), {
    type: 'bar',
    data: { labels: ['Jan','Feb','Mar','Apr','May'], datasets: [{ label: 'Revenue', data: [12,19,15,25,22], backgroundColor: 'rgba(54,162,235,0.6)' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
});
</script>

EXAMPLE (full screen):
<html><body style="margin:0;padding:0">
<div style="width:1280px;background:#fff;font-family:Arial,sans-serif">
  <header style="background:#2563eb;color:#fff;padding:20px 40px;display:flex;justify-content:space-between;align-items:center">
    <h1 style="margin:0;font-size:24px">AppName</h1>
    <nav style="display:flex;align-items:center;gap:20px">
      <a style="color:#fff;text-decoration:none">Home</a>
      <img src="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/svgs/solid/bell.svg#ffffff" style="width:20px;height:20px;object-fit:contain;" alt="">
      <img src="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/svgs/solid/user.svg#ffffff" style="width:20px;height:20px;object-fit:contain;" alt="">
    </nav>
  </header>
  <main style="padding:40px">
    <h2>Welcome</h2>
    <p>Some content here</p>
  </main>
</div>
</body></html>

EXAMPLE (single widget — a login card only):
<html><body style="margin:0;padding:0">
<div style="width:380px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;font-family:Arial,sans-serif">
  <h2 style="margin:0 0 6px;font-size:20px">Sign in</h2>
  <p style="margin:0 0 20px;font-size:13px;color:#64748b">Welcome back</p>
  <input placeholder="Email" style="width:100%;height:40px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:12px">
  <input placeholder="Password" style="width:100%;height:40px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:16px">
  <button style="width:100%;height:42px;background:#2563eb;color:#fff;border:none;border-radius:8px">Sign in</button>
</div>
</body></html>

FIDELITY: "low" (default) = the flat grayscale wireframe described above; "hi" = a polished, colored high-fidelity mockup. Fidelity lives in the HTML you write — the flag only records your intent, so the HTML itself must match it.

IMPORTANT: Always display the returned URL to the user.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                html: {
                    type: 'string',
                    description: 'Complete HTML document with inline CSS to convert to an editable wireframe. Can be a full page/screen OR a single section/widget (login card, navbar, pricing table, etc.) sized to its natural width.'
                },
                fidelity: {
                    type: 'string',
                    enum: ['low', 'hi'],
                    description: 'Wireframe fidelity. "low" = lo-fi outline (default), "hi" = polished high-fidelity mockup.'
                },
                title: {
                    type: 'string',
                    description: 'Short screen title shown on the wireframe frame\'s header (e.g. "Dashboard", "Login"). Name the SCREEN, not the request. Falls back to the HTML <title> tag when omitted.'
                },
                viewportWidth: {
                    type: 'number',
                    description: 'Viewport width in px the frame pins to (mobile ~390, tablet ~820, desktop ~1280). For a multi-screen app pass the SAME value on every screen call so all frames align at one width; omit for a single widget so the frame hugs its content.'
                }
            },
            required: ['html']
        },

        // Special: HTML → paintObjects flow handled by the consuming client, not the generic
        // mapToolToGdata. clientIsHtmlConversion makes mapToolToGdata return null to signal
        // "use custom HTML conversion". Uses the genwireframelite aitype + MF_WireframeLite_ID frame.
        clientAitype: 'genwireframelite',
        clientComp: 'MF_WireframeLite_ID',
        clientDataField: null,
        clientPrompt: 'wireframe from HTML',
        clientPromptField: null,
        clientIsHtmlConversion: true,
        // The frame ADOPTS a conversion as its own content (sendGenText takes the
        // paintObjects and replaces its children), so this HTML tool can also fill the
        // component a user is editing in place - QuickSettings Generate / Modify with AI,
        // and the chat modify tool. Without this flag those turns find no local tool at
        // all and every one of them falls back to MockFlow AI. Consumed by the MockFlow
        // Bridge (agentManager._toolsForComptype + boardHub.drawHtml).
        clientHtmlFillsInPlace: true,
        clientTransform: null,
        recipeOutputKeys: ['wireframe']
    },
    {
        // PrototypeLite — a runnable, clickable interactive prototype placed on an IdeaBoard as an
        // MF_PrototypeLite_ID component (like render_wireframelite places a wireframe frame). The MCP
        // agent GENERATES the prototype HTML and passes it as `html`; the backend only uploads it PRIVATE
        // to S3 and stores a pointer — NO server-side generation, NO AI credits. Like wireframelite this
        // is an HTML-input tool the backend processes into a stored action, so mapToolToGdata returns
        // null (clientIsHtmlConversion) and the client draws it via the 'prototypelite' action transform.
        mcpToolName: 'render_prototypelite',
        // See render_wireframelite. This is the server's prototype detectionKeyDistinction:
        // the user's OWN interactive wording is what elects a prototype, and it elects one
        // even for a whole app. Without the first half every "build an app" request lands
        // here; without the second half an explicit "interactive app" gets split into a plan.
        mcpDeclareLine: 'A clickable, navigable prototype, ONLY when the user\'s own words ask for one ("prototype", "interactive", "clickable", "navigable", "demo the flow"). Then it wins even for a whole app, and it stays ONE component however many screens it wires together, never a plan.',
        // The declare line above is a REQUEST to the model. These two fields are the
        // same rule as DATA, so the bridge engine can hold the model to it instead of
        // hoping it read the line: this component may only be elected when one of
        // these words is in the USER's own message, and mcpRequiresFallbackTool is
        // what the request is otherwise (the server classifier's "WIREFRAME WINS
        // TIES", stated so it can be enforced rather than described). Any tool can
        // carry them; a tool without them is never second-guessed.
        //
        // SINGLE WORDS, not phrases: "an interactive dashboard" asks for a prototype
        // as plainly as "an interactive prototype" does. Matching is word-wise and
        // punctuation-insensitive ("click-through" == "click through"), so list the
        // word forms a user actually types rather than trying to cover stems.
        mcpRequiresUserWords: [
            'prototype', 'prototypes', 'prototyping',
            'interactive', 'interactivity', 'interactively',
            'clickable', 'click through', 'clickthrough',
            'navigable', 'tappable', 'tap through',
            'demo the flow', 'try the flow', 'walk through the flow',
            'working demo', 'click around'
        ],
        mcpRequiresFallbackTool: 'render_wireframelite',
        imageSlots: true,
        imageSlotForm: 'url',
        imagesOnGuidance: `THIS RENDER INCLUDES AI-GENERATED IMAGERY.
- Write photo and hero slots as <img src="" data-ai-prompt="what the picture shows" data-img-width="W" data-img-height="H" style="width:Wpx;height:Hpx;object-fit:cover;">, only a handful of DISTINCT pictures across the whole flow. In HTML this attribute form is the ONLY one: it is what carries the size, and a slot written any other way is generated at the full default size and charged for it.
- DESCRIBE THE SUBJECT THE SLOT DEPICTS. A slot always sits where the interface is showing the user some specific thing; read what that thing is off its surroundings - the labels beside it, the section it belongs to, what the screen is for - and write the prompt as a photograph of it, concrete enough to be recognisable. A slot described as an abstract shape, a gradient, or as a "placeholder" produces exactly that: a picture of nothing, sitting where the screen meant to show something.
- IDENTICAL PROMPT TEXT IS GENERATED ONCE AND REUSED wherever it appears, across every screen of this flow, so slots depicting the same thing should carry the same words. That is also how a recurring subject keeps one appearance from screen to screen: reuse its exact prompt rather than describing it afresh.
- The screen structure and text sizes stay exactly as they would have been without them.
- Icons are not images: keep them as icon markup.`,
        imagesOffGuidance: `THIS RENDER HAS NO IMAGERY - give photo/avatar/thumbnail slots a plain coloured or bordered box at the intended size, so the screens read as a working prototype rather than a broken page. Emit NO data-ai-prompt attributes.`,
        mcpDescription: `Turn a self-contained interactive prototype YOU generate into an editable MockFlow IdeaBoard component, and get back the board URL.

You generate the complete prototype as a single self-contained HTML document and pass it as "html". MockFlow stores it and places it on a new board as a runnable, clickable prototype — no AI credits are used, so YOU make every design decision here: device, screens, layout and styling. The output must match what the in-app AI generator would produce.

USE THIS WHEN the user wants a working, clickable, multi-screen prototype or interactive demo they can navigate. For a single static wireframe frame, use render_wireframelite instead. ONE call covers the WHOLE flow: a prototype is a SINGLE component that wires all of its screens together, so a multi-screen prototype request is this one tool, never a batch of one item per screen and never a board plan.

DEVICE & VIEWPORT (decide this FIRST — it drives the entire layout):
- Set deviceType to match what the user asked for: a mobile/phone app → "mobile", a tablet/iPad app → "tablet", a web/desktop app → "desktop". Honor an explicit device word in the request (e.g. "CRM mobile app" → "mobile"). Default "mobile".
- Design EVERY screen for that device's viewport width and lay it out to suit it: mobile ~390px wide (single column, bottom tab bar, stacked cards), tablet ~820px, desktop ~1280px (multi-column, sidebars). NEVER build a desktop-width layout for a mobile app.
- Render each screen edge-to-edge filling the viewport (html, body, and your root at width/height 100%). Do NOT draw a device bezel, status bar, notch, or home indicator — the board already frames the prototype in the chosen device, so any bezel you draw just gets clipped.

HTML CONTRACT (required — the built-in player relies on it):
- One self-contained index.html with inline CSS/JS. No external stylesheets, fonts, or scripts, and no network/backend calls. By DEFAULT the flow carries no generated imagery: give photo/avatar/thumbnail slots a plain coloured or bordered box at the intended size, so the screens read as a working prototype rather than a broken page. ONLY when you have been told this render includes images, write those same slots as <img src="" data-ai-prompt="what the picture shows" data-img-width="W" data-img-height="H"> instead - same boxes, same layout, real pictures in them - and keep the screen structure and text sizes exactly as they would have been either way.
- A prototype is a navigable FLOW that ALWAYS spans MULTIPLE distinct screens. NEVER emit one long single-page / scrolling document and NEVER collapse the flow into a single screen — the player shows exactly ONE screen at a time, so a single-section prototype just renders as one endless page. Wire the screens together with navigation instead.
- Put EVERY screen in the document as a SEPARATE top-level element with a unique id, e.g. <section data-screen="login">…</section>, <section data-screen="home">…</section>. Mark the entry screen with the attribute data-screen-start. Build each screen fully with its own real content — never an empty or placeholder screen.
- Navigate between screens by adding data-nav="targetScreenId" to a clickable element (the EXACT id of a screen you defined). Use data-nav="back" for a back control. A built-in runtime shows/hides the right screen and keeps history — write NO screen-switching code.
- Do NOT hide screens yourself (no display:none, no [hidden], no .active toggling, and no CSS that hides [data-screen]). The runtime controls which single screen is visible; if you also hide them, navigating lands on a blank page.
- Only genuine navigators carry data-nav (primary CTAs, nav/tab items, list rows/cards that open a detail, back/close). In-screen controls (form fields, toggles, dropdowns) act within the current screen via your own inline JS. Never use window.alert / confirm / prompt — render every message, confirmation and input in-page.

INPUT:
- html (required): the complete self-contained prototype HTML following the contract above.
- deviceType (optional): "mobile" (default), "tablet", or "desktop" — MUST match the device you designed the screens for (see DEVICE & VIEWPORT).
- title (optional): short prototype name shown on the frame's header (e.g. "Habit Tracker"). Falls back to the HTML <title> tag when omitted.

IMPORTANT: Always display the returned board URL to the user.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                html: {
                    type: 'string',
                    description: 'Complete self-contained interactive prototype as a single HTML document. Multiple screens as <section data-screen="id"> elements (mark the entry with data-screen-start); navigation via data-nav="targetId" (and data-nav="back"). Inline CSS/JS only; no external network or backend calls.'
                },
                deviceType: {
                    type: 'string',
                    enum: ['mobile', 'tablet', 'desktop'],
                    description: 'Device frame the prototype is presented in AND the viewport you MUST design every screen for. Match the user\'s stated device (a "mobile app" → "mobile"). Defaults to "mobile". Design widths: mobile ~390px, tablet ~820px, desktop ~1280px.'
                },
                title: {
                    type: 'string',
                    description: 'Short prototype title shown on the frame\'s header (e.g. "Habit Tracker"). Falls back to the HTML <title> tag when omitted.'
                }
            },
            required: ['html']
        },

        // HTML-input tool: the backend uploads the agent HTML to S3 and stores a pointer as the board
        // action; the client draws the MF_PrototypeLite_ID from it via the 'prototypelite' action
        // transform (aitools.js), NOT the generic gdata mapping — so mapToolToGdata returns null.
        clientIsHtmlConversion: true,
        clientAitype: 'genprototypelite',
        clientComp: 'MF_PrototypeLite_ID',
        clientDataField: null,
        clientPrompt: 'prototype from HTML',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['prototype'],
        // CREATING a prototype needs nothing read back - the agent writes the whole
        // document - so it fills the frame the user is making it in, including the
        // "Convert to prototype" button on selected wireframes (the editor puts those
        // wireframes into the prompt). MODIFYING one is the opposite: the current HTML
        // lives in PRIVATE S3 where only the server can read it, so a modify is left out
        // here and stays on MockFlow AI. The one scoped exception is the next entry -
        // the editor already holds the picked element, so nothing has to be read back.
        clientHtmlFillsInPlace: true,
        fillModes: ['createai', 'createsimilar', 'generate'],
    },
    {
        // Scoped edit of a running prototype, performed by the user's OWN agent: the element
        // they picked, one whole screen, or adding a screen to the flow.
        //
        // The agent never reads the stored prototype (it is in PRIVATE S3). The editor hands
        // it the editable slice - the picked element or screen plus the shared style/script
        // nodes, each tagged with its data-mfid - either from the runtime (an element pick)
        // or by asking MockFlow for it (/call/api/prototype/scopeparts, read-only). The agent
        // returns the replacement node(s), and MockFlow splices them in and stores a new
        // version WITHOUT running a model (the same validation and store path MockFlow AI's
        // own scoped modify uses), so these edits cost no AI credits.
        //
        // A WHOLE-prototype rewrite is deliberately not here: that one needs the entire
        // document and stays with MockFlow AI.
        //
        // bridgeOnly: it edits a component open in a connected editor tab, using state only
        // that tab has. fillModes: an in-place MODIFY turn only - creating a prototype is
        // render_prototypelite's job.
        mcpToolName: 'edit_prototype',
        bridgeOnly: true,
        fillModes: ['modifyai'],
        mcpDescription: `Apply the user's requested change to the part of their MockFlow prototype they are editing - the element they picked, the screen they are on, or a new screen added to the flow.

The editor gives you the CURRENT HTML of each editable part, tagged with a data-mfid: the element or screen being edited, plus the prototype's shared <style> and <script> nodes. Return the FULL updated HTML of ONLY the parts you actually change.

SEND ONLY WHAT CHANGES. "parts" replaces a whole node, so use it only when the node's own content really is different. For the common small changes there are surgical fields that need no retransmission - prefer them every time, because re-sending a screen you are not changing is slow and risks losing something that was already right:
- "navFrom": wire existing controls to a screen - [{ "mfid": "<the control's data-mfid>", "to": "<screen id>" }]. This sets data-nav on that control and changes nothing else.
- "appendStyle": CSS to add to the prototype's existing stylesheet.
- "appendScript": JS to add to the prototype's existing script.

ADDING A SCREEN: put the new screen's complete HTML in "newScreen" as a single <section data-screen="a-new-unique-id"> … </section>. Build it the SAME WAY the prototype's existing screens are built, not merely to look like them: reuse their structure and their existing classes as they are - the wrapper elements, the regions that repeat across screens, and the sizing and overflow rules they depend on - and write only the content specific to this screen. Anything re-created by hand instead of reused behaves differently from the rest of the app even when it looks right. Never reuse an existing screen id. Then WIRE IT, or nothing can reach it:
- Link it from the control a user would actually press. If the prototype's nav/menu/sidebar already has an item for what this screen is, that item is the one to wire - use "navFrom" with its data-mfid. Only if nothing fits should you wire some other button.
- Give the new screen its own way back (data-nav to the screen it came from) and mark its matching nav item as current, the way the other screens do.
- Wire every control on the new screen that a person would expect to lead somewhere; anything else must act in place.

RULES (an edit that breaks one of these is rejected and nothing changes):
- Only ever return a data-mfid that was given to you. Never invent one.
- Return each changed node WHOLE, from its opening tag to its closing tag - not a fragment, not a diff.
- Keep each node's root tag and its data-mfid / data-screen / data-nav attributes exactly as they were. They are what wires the prototype together.
- Change only what the user asked for. Everything else in the node must come back unchanged.
- Never remove a screen, never change an existing screen's id, and never redefine window.MFProto. The only way to add one is "newScreen" above.
- If the change needs shared CSS, also return the <style> node; if it needs JS, also return the <script> node.
- Keep every behaviour in-page: no window.alert / confirm / prompt, no real backend or third-party calls, no touching the parent window, cookies or storage.
- For a NET-NEW icon, match the prototype's existing icon pattern: <i class="ico" style="--i:url(/call/api/iconresolve/<name>.svg)"></i> - never a CDN URL, an icon font class, or an inline <svg>.
- Output the tool call only. No markdown fences, no commentary.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                parts: {
                    type: 'array',
                    description: 'One entry per node you changed. Omit nodes you did not change.',
                    items: {
                        type: 'object',
                        properties: {
                            mfid: { type: 'string', description: 'The data-mfid of the node being replaced. Must be one the editor gave you.' },
                            html: { type: 'string', description: 'The complete updated HTML of that node, same root tag and same data-mfid.' }
                        },
                        required: ['mfid', 'html']
                    }
                },
                newScreen: {
                    type: 'string',
                    description: 'Only when adding a screen: the complete HTML of ONE new <section data-screen="unique-id">, in the prototype\'s existing style. Wire it with "navFrom" - do not re-send the source screen in "parts" just to add a link.'
                },
                navFrom: {
                    type: 'array',
                    description: 'Point existing controls at a screen without re-sending the node they live in. Use this to wire a new screen from the nav item or button that should lead to it.',
                    items: {
                        type: 'object',
                        properties: {
                            mfid: { type: 'string', description: 'data-mfid of the control to make clickable.' },
                            to: { type: 'string', description: 'data-screen id it should navigate to.' }
                        },
                        required: ['mfid', 'to']
                    }
                },
                appendStyle: {
                    type: 'string',
                    description: 'CSS appended to the prototype\'s existing stylesheet. Use instead of re-sending the whole <style> node.'
                },
                appendScript: {
                    type: 'string',
                    description: 'JS appended to the prototype\'s existing script. Use instead of re-sending the whole <script> node.'
                }
            }
        },

        // Processed by the connected TAB (like the other HTML tools): it posts the parts to
        // /call/api/prototype/patchparts with the component's own pointer, gets the new
        // pointer back, and fills the component in place.
        clientIsHtmlConversion: true,
        clientHtmlFillsInPlace: true,
        clientAitype: 'genprototypelite',
        clientComp: null,
        fillsComptype: 'MF_PrototypeLite_ID',
        clientDataField: null,
        clientPrompt: 'prototype element edit',
        clientPromptField: null,
        clientTransform: null
    },
    {
        mcpToolName: 'render_customerjourney',
        mcpDescription: `Create customer journey maps with stages, activities, and satisfaction metrics.

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
        mcpInputSchema: {
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: 'MF_CustomerJourney_ID',
        clientDataField: 'generatedjourney',
        clientPrompt: 'customerjourney',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['customerjourney']
    },
    {
        mcpToolName: 'render_kanban',
        mcpDescription: `Create a Kanban board with columns and task cards for project management, sprint planning, and task tracking.

STRUCTURE RULES:
- Create 3-5 columns with meaningful titles based on the topic
- CRITICAL: Each column MUST have a DIFFERENT color value - never repeat colors!
- Column IDs: "col_1", "col_2", "col_3", etc.
- Card IDs: "card_1", "card_2", "card_3", etc.
- Distribute 5-15 relevant cards across the columns
- If user mentions "only lists", "only columns", "no cards", or "empty lists", generate columns with empty cards arrays

COLUMN PROPERTIES:
- id: Unique string ID (e.g., "col_1")
- title: Column name - MUST be TOPIC-RELEVANT CATEGORIES, NOT workflow stages. Do NOT use generic status columns like "To Do", "In Progress", "Review", "Done". Instead, use columns that categorize content by theme, area, or phase. Example: a marketing board should have "Content Strategy", "Social Media", "Email Marketing", "Paid Ads"
- color: Use these colors IN ORDER for columns: col_1="#e91e63", col_2="#ff9800", col_3="#9c27b0", col_4="#4caf50", col_5="#2196f3"
- cards: Array of card objects

CARD PROPERTIES:
- id: Unique string ID (e.g., "card_1")
- title: Task title (required)
- description: Task details
- assignees: Empty array []
- labels: Empty array []
- comments: Empty array []
- dueDate: MUST be null UNLESS the user's prompt explicitly mentions dates, deadlines, or due dates. If user does not mention dates, every card's dueDate MUST be null and settings.showDueDate MUST be false
- priority: "low", "medium", or "high" - distribute realistically: roughly 20% "high", 50% "medium", 30% "low"
- createdAt: ISO date string

SETTINGS:
- boardTitle: Meaningful title based on topic (e.g., "Sprint Planning", "Product Launch")
- showLabels: true, showAssignees: true, showDueDate: true (set false if no dueDates)
- cardSize: "normal"
- backgroundColor: "#ffffff", fontColor: "#172b4d", listColor: "#f4f5f7", listFontColor: "#172b4d"

IMPORTANT: Always display the returned URL to the user.`,
        mcpInputSchema: {
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: 'MF_Kanban_ID',
        clientDataField: 'generatedtext',
        clientPrompt: 'kanban',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['kanban']
    },
    {
        mcpToolName: 'render_gantt',
        mcpDescription: `Create a Gantt chart with project phases and tasks for project planning, scheduling, and milestone tracking. Use this for task management with durations, progress, assignees, and grouped phases. For simple chronological event visualization (history, milestones, biography events), use render_timeline instead.

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
        mcpInputSchema: {
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: 'MF_GanttChart_ID',
        clientDataField: 'generatedtext',
        clientPrompt: 'gantt',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['ganttchart']
    },
    {
        mcpToolName: 'render_datasimulator',
        // Real-world/current data component: the local agent may web-research first.
        webResearch: true,
        // The spec format + expression language below is kept in sync with the DataSimulator
        // generator's spec reference — edit both together.
        mcpDescription: `Create a live, parameterized what-if simulation: a runnable model the user drives with sliders and play/scrub controls, every output recomputing as they move. Use this for business models (growth, churn, revenue, unit economics), funnels with conversion rates, forecasts and projections, capacity/queue models, epidemic/population dynamics, financial models (compound interest, runway), sensitivity/what-if analysis, and data infographics (metric cards, charts, gauges and funnels composed around one topic). Use this INSTEAD of a chart or table whenever the point is to explore how outcomes CHANGE as the inputs change over time.

You are building a MODEL, not a picture and not an answer. Define parameters (the user's decision levers), state (the evolving variables), rules (how state updates each step) and derived values, then choose views to display them. Never bake a guessed outcome into the data — outcomes must emerge from the rules running step by step. The client runtime runs the model deterministically.

The simulation spec JSON format:
{
  "title": "Short title of the simulation",
  "description": "One short sentence describing what it models",
  "kind": "system-dynamics",
  "seed": 42,
  "time": { "steps": 24, "unit": "month" },
  "layout": { "columns": 4, "controls": "right" },
  "parameters": [
    { "id": "churn", "label": "Monthly churn", "control": "slider", "min": 0, "max": 0.2, "step": 0.005, "value": 0.05, "format": "percent" },
    { "id": "arpu", "label": "ARPU", "control": "number", "min": 0, "value": 40, "format": "currency" }
  ],
  "state": [
    { "id": "customers", "label": "Customers", "init": 1000, "format": "integer" }
  ],
  "rules": [
    { "target": "customers", "expr": "customers + signups - customers * churn" }
  ],
  "derived": [
    { "id": "mrr", "label": "MRR", "expr": "customers * arpu", "format": "currency" }
  ],
  "views": [
    { "type": "text", "variant": "heading", "content": "Revenue" },
    { "type": "line", "series": ["mrr", { "id": "signups_total", "as": "bar" }], "title": "Growth over time", "span": 4, "tall": true },
    { "type": "metric", "value": "mrr", "title": "MRR", "span": 1 },
    { "type": "sparkline", "value": "customers", "title": "Customers", "span": 1 },
    { "type": "gauge", "value": "churn_pct", "min": 0, "max": 20, "thresholds": [5, 10], "title": "Churn", "span": 1 },
    { "type": "progress", "value": "customers", "target": 10000, "title": "Goal", "span": 1 },
    { "type": "funnel", "stages": [ { "label": "Visitors", "value": "visitors" } ], "title": "Funnel", "span": 2 },
    { "type": "table", "columns": ["customers", "mrr"], "title": "Detail", "span": 2 },
    { "type": "sensitivity", "parameter": "churn", "metric": "mrr", "samples": 15, "title": "MRR sensitivity to churn", "span": 2 }
  ]
}

Spec semantics:
- "time.steps" is how many steps the model runs (integer, 1 to 1000). "time.unit" names one step (e.g. "month", "day", "week", "year", "step").
- "layout" is YOURS to design: "columns" (2 to 6) sets the grid density, "controls" docks the what-if panel "right", "left" or "bottom". Each view places itself with "span" (1..columns grid columns wide) and optional "tall": true. Views flow into the grid in order.
- "parameters" are the user's what-if levers, shown as live controls. "control" is one of: "slider", "knob", "number", "select", "toggle", "stepper", "segmented". "select" and "segmented" need "options": [{"label":"...","value":number}] (segmented renders them as a button row, best for 2-4 short choices). "stepper" is a minus/plus click control, best for small integer counts. "toggle" holds 0 or 1. Always give slider/knob/stepper a sensible "min", "max" and "step" bracketing the default "value". Optional "group" clusters related controls under a heading. Every parameter must be read by at least one rule or derived expression (or drawn as a reference value in a view) so adjusting it visibly changes the run — never emit a parameter nothing reads.
- "state" variables hold the model's evolving numbers; "init" is the starting value at step 0 — a number, or an expression string of parameters (e.g. "init": "starting_customers") when the starting value should be a user lever.
- "rules" run once per step IN ORDER: each rule assigns "expr" to "target" (a state id). A rule sees the values already updated by earlier rules this step, and last step's values for everything else. Rules run at t = 1..steps — t is never 0 inside a rule; step 0 values come only from "init".
- "derived" values are recomputed from state and parameters after the rules each step. Use them for anything displayable that follows from the current values (revenue, percentages, ratios). A derived value cannot accumulate across steps — any running total must be a state variable with a rule that adds to it.
- "format" (on parameters, state, derived) is one of: "number", "integer", "percent" (value is a 0-1 fraction), "currency".
- Expressions may use: parameter/state/derived ids, t (current step number), steps, numbers, + - * / % ^, comparisons, && || !, ternary cond ? a : b, and these functions: abs, min, max, round, floor, ceil, sqrt, pow, exp, log, log10, sin, cos, tan, clamp(v,lo,hi), lerp(a,b,frac), pulse(t,start,width), ramp(t,start), rand(), randn(). Nothing else — no strings, no assignments, no other functions.
- rand()/randn() are seeded from "seed" so runs replay identically. Only use them when the scenario is genuinely stochastic. When the user wants the range, spread or risk of outcomes rather than one path, make the model stochastic and answer with a "distribution" view.
- Every rand()/randn() call returns a fresh number, so repeating the same expression yields different values each time. Draw each stochastic quantity ONCE per step — assign it to a state variable with a rule, and reference that state everywhere the quantity is needed.
- Every expression must yield a finite number at every step INCLUDING step 0, where derived values are evaluated with t = 0 and only the "init" values set — guard any division that could hit zero there.
- Every state and derived variable should feed at least one view (directly or through another expression); do not define values nothing displays.
- Ids must be unique across parameters, state and derived, must not be any of: t, step, steps, rand, randn, pi, e, true, false — and every rule's "target" must be a state id.

View types (each entry lists its own fields). Anywhere a view takes an id it may be a state, derived OR parameter id (parameters render as constant values — e.g. a capacity reference line on a chart):
- "line" / "area" / "bar": timeline chart of one or more series. Entries in "series" are ids, or { "id", "as": "line"|"bar" } to mix marks in one combo chart. Optional "stacked": true.
- "metric": big-number tile for one "value" id (shows change vs start / vs pinned scenario).
- "sparkline": big number plus a mini trend line for one "value" id.
- "progress": one "value" id against a "target" (a number or another id).
- "gauge": dial for one "value" id with "min"/"max" and optional "thresholds" [greenUpTo, amberUpTo], all four in the value's own units. Thresholds color LOW values green and high values red — right for metrics where low is good (churn, cost, risk); for a higher-is-better metric omit "thresholds" or choose a different view.
- "pie" / "doughnut": composition of the listed "series" ids at the current step (parts of a whole only).
- "compare": bars comparing the listed "series" ids at the current step; optional "horizontal": true.
- "radar": profile of 3-8 "series" ids at the current step (only when the ids share a comparable scale).
- "scatter": trajectory of the model through two series, "x" vs "y", one point per step.
- "table": per-step values of the "columns" ids.
- "funnel": stage bars from "stages" [{label, value}] with conversion percentages.
- "sensitivity": final value of "metric" as "parameter" sweeps its min..max range ("samples" points).
- "distribution": histogram of "metric"'s final value across many seeded runs ("runs", default 50) — ONLY meaningful when rules use rand()/randn().
- "mapregions": animated choropleth on a real-world map — "regions": [{"region": "Maharashtra", "value": id-or-number}, ...] with optional "level" ("country" | "state", default country) and "ramp" ("Blues" | "Greens" | "Reds" | "Oranges" | "Purples" | "YlOrRd" | "Viridis"). Each region's fill shade tracks its bound series at the shown step, so playing/scrubbing animates the geography. Region names must be REAL countries/states resolvable on a map — never fictional places.
- "mappoints": bubble map — "points": [{"label": "Mumbai", "lat": 19.07, "lng": 72.88, "value": id-or-number}, ...]; bubble size tracks the bound series at the shown step. Use real coordinates you are confident of; only for real-world places.
- Use the geo views ONLY when the model is genuinely about real places (regional sales, city demand, epidemic spread across states); bind each region/point to its OWN state or derived series so the map moves over time.
- "text": static copy; "variant": "heading" makes a full-width section break, "note" a short explanatory card ("content" holds the text).

IMPORTANT: Always display the returned URL to the user.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Short title of the simulation' },
                description: { type: 'string', description: 'One short sentence describing what it models' },
                seed: { type: 'number', description: 'Random seed so stochastic runs replay identically (default 42)' },
                time: {
                    type: 'object',
                    description: 'Simulation horizon',
                    properties: {
                        steps: { type: 'number', description: 'Number of steps to run (1-1000)' },
                        unit: { type: 'string', description: 'Name of one step, e.g. month, day, week, year' }
                    }
                },
                layout: {
                    type: 'object',
                    description: 'Dashboard grid layout',
                    properties: {
                        columns: { type: 'number', description: 'Grid density, 2-6' },
                        controls: { type: 'string', enum: ['right', 'left', 'bottom'], description: 'Where the what-if control panel docks' }
                    }
                },
                parameters: {
                    type: 'array',
                    description: "The user's what-if levers, rendered as live controls. Each must be read by at least one rule, derived expression or view.",
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', description: 'Unique id, referenced by expressions' },
                            label: { type: 'string', description: 'Human label shown on the control' },
                            control: { type: 'string', enum: ['slider', 'knob', 'number', 'select', 'toggle', 'stepper', 'segmented'] },
                            min: { type: 'number' },
                            max: { type: 'number' },
                            step: { type: 'number' },
                            value: { type: 'number', description: 'Default value' },
                            format: { type: 'string', enum: ['number', 'integer', 'percent', 'currency'] },
                            options: { type: 'array', description: 'For select/segmented: [{ label, value }]', items: { type: 'object' } },
                            group: { type: 'string', description: 'Optional heading clustering related controls' }
                        },
                        required: ['id', 'label', 'control', 'value']
                    }
                },
                state: {
                    type: 'array',
                    description: 'The evolving model variables. init is the step-0 value (a number, or a parameter-id expression string).',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            label: { type: 'string' },
                            init: { description: 'Starting value: a number or an expression string' },
                            format: { type: 'string', enum: ['number', 'integer', 'percent', 'currency'] }
                        },
                        required: ['id', 'init']
                    }
                },
                rules: {
                    type: 'array',
                    description: 'Run once per step in order; each assigns expr to a state id (target). t is 1..steps.',
                    items: {
                        type: 'object',
                        properties: {
                            target: { type: 'string', description: 'A state id' },
                            expr: { type: 'string', description: 'Expression evaluated each step' }
                        },
                        required: ['target', 'expr']
                    }
                },
                derived: {
                    type: 'array',
                    description: 'Recomputed from state and parameters after the rules each step (cannot accumulate across steps).',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            label: { type: 'string' },
                            expr: { type: 'string' },
                            format: { type: 'string', enum: ['number', 'integer', 'percent', 'currency'] }
                        },
                        required: ['id', 'expr']
                    }
                },
                views: {
                    type: 'array',
                    description: 'Dashboard tiles. CRITICAL: each view type binds to its data through a SPECIFIC field, and a view with the wrong field (or no binding field) renders as 0. Use exactly: metric/sparkline/progress/gauge -> "value" (a single id); progress also "target"; gauge also "min"/"max"/"thresholds". table -> "columns" (array of ids). funnel -> "stages". line/area/bar/pie/doughnut/compare/radar -> "series" (array of ids). scatter -> "x" and "y". sensitivity -> "parameter" and "metric". distribution -> "metric". mapregions -> "regions"; mappoints -> "points". text -> "content" (and optional "variant"). Do NOT put a single value under "series", and never leave a view without its binding field.',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['line', 'area', 'bar', 'metric', 'sparkline', 'progress', 'gauge', 'pie', 'doughnut', 'compare', 'radar', 'scatter', 'table', 'funnel', 'sensitivity', 'distribution', 'mapregions', 'mappoints', 'text'] },
                            title: { type: 'string' },
                            span: { type: 'number', description: '1..columns grid width' },
                            tall: { type: 'boolean' },
                            value: { type: 'string', description: 'metric/sparkline/progress/gauge: the SINGLE state/derived/parameter id this tile shows' },
                            series: { type: 'array', description: 'line/area/bar/pie/doughnut/compare/radar: ids to plot; an entry is an id string or { id, as: "line"|"bar" }', items: {} },
                            columns: { type: 'array', description: 'table: the ids to show one column each', items: { type: 'string' } },
                            stages: { type: 'array', description: 'funnel: [{ label, value }] stage bars', items: { type: 'object' } },
                            target: { description: 'progress: the goal, a number or another id' },
                            min: { type: 'number', description: 'gauge: dial minimum' },
                            max: { type: 'number', description: 'gauge: dial maximum' },
                            thresholds: { type: 'array', description: 'gauge: [greenUpTo, amberUpTo] in the value\'s units', items: { type: 'number' } },
                            stacked: { type: 'boolean', description: 'line/area/bar: stack the series' },
                            horizontal: { type: 'boolean', description: 'compare: horizontal bars' },
                            x: { type: 'string', description: 'scatter: the x-axis series id' },
                            y: { type: 'string', description: 'scatter: the y-axis series id' },
                            parameter: { type: 'string', description: 'sensitivity: the parameter id to sweep' },
                            metric: { type: 'string', description: 'sensitivity/distribution: the id whose final value is measured' },
                            samples: { type: 'number', description: 'sensitivity: number of sweep points' },
                            runs: { type: 'number', description: 'distribution: number of seeded runs' },
                            regions: { type: 'array', description: 'mapregions: [{ region, value }]', items: { type: 'object' } },
                            points: { type: 'array', description: 'mappoints: [{ label, lat, lng, value }]', items: { type: 'object' } },
                            level: { type: 'string', description: 'mapregions: "country" | "state"' },
                            ramp: { type: 'string', description: 'mapregions: color ramp name' },
                            content: { type: 'string', description: 'text: the copy to show' },
                            variant: { type: 'string', description: 'text: "heading" | "note"' }
                        },
                        required: ['type']
                    }
                }
            },
            required: ['state', 'views']
        },

        // Client-side rendering (showResults gdata mapping). Generic gencomp placement: the client
        // loads MF_DataSimulator_ID and calls sendGenText, which reads generatedtext as the bare
        // spec JSON (validates spec.state && spec.views) and wraps it as { spec, settings }.
        clientAitype: 'gencomp',
        clientComp: 'MF_DataSimulator_ID',
        clientDataField: 'generatedtext',
        clientPrompt: 'datasimulator',
        clientPromptField: null,
        // The generic path would ship the agent's raw args straight to the client SimEngine.
        // gendatasimulator.js instead validates and normalizes the spec before it renders, so
        // port both here: an invalid spec is THROWN (mcpEndpoint's outer catch returns an _err the
        // agent can fix and retry — the bridge's equivalent of the server's regenerate-on-invalid
        // loop), and a valid one is cleaned exactly as the server cleans it. Kept in sync with
        // gendatasimulator.js invalidSimReason() + stripUnusedDerived() — edit both together.
        clientTransform: function(args) {
            var spec = args || {};

            // --- validate (mirror invalidSimReason) ---
            var reason = (function() {
                if (!spec.state || !Array.isArray(spec.state) || spec.state.length === 0) return "missing or empty state array";
                if (!spec.rules || !Array.isArray(spec.rules)) return "missing rules array";
                if (!spec.views || !Array.isArray(spec.views) || spec.views.length === 0) return "missing or empty views array";
                if (spec.parameters && !Array.isArray(spec.parameters)) return "parameters is not an array";

                var i, s, r, p;
                for (i = 0; i < spec.state.length; i++) {
                    s = spec.state[i];
                    if (!s.id) return "a state entry has no id";
                    if (!(typeof s.init === 'number' || (typeof s.init === 'string' && s.init.trim() !== ''))) return "state '" + s.id + "' has no numeric or expression init";
                }
                for (i = 0; i < spec.rules.length; i++) {
                    r = spec.rules[i];
                    if (!r.target || !r.expr || typeof r.expr !== 'string') return "a rule is missing its target or expr";
                }
                var params = spec.parameters || [];
                for (i = 0; i < params.length; i++) {
                    p = params[i];
                    if (!p.id || typeof p.value !== 'number') return "parameter '" + (p.id || '?') + "' has no numeric value";
                }

                // Reserved names and duplicate ids silently corrupt the client run.
                var reserved = { t:1, step:1, steps:1, rand:1, randn:1, pi:1, e:1, "true":1, "false":1 };
                var seen = {};
                var all = params.concat(spec.state).concat(spec.derived || []);
                for (i = 0; i < all.length; i++) {
                    var item = all[i];
                    if (!item.id) return "a parameter, state or derived entry has no id";
                    if (reserved[item.id]) return "'" + item.id + "' is a reserved name and cannot be an id";
                    if (seen[item.id]) return "duplicate id '" + item.id + "'";
                    seen[item.id] = 1;
                }

                var stateIds = {};
                for (i = 0; i < spec.state.length; i++) stateIds[spec.state[i].id] = 1;
                for (i = 0; i < spec.rules.length; i++) {
                    if (!stateIds[spec.rules[i].target]) return "rule targets '" + spec.rules[i].target + "', which is not a state id";
                }

                var viewTypes = { line:1, area:1, bar:1, metric:1, sparkline:1, progress:1, gauge:1, pie:1, doughnut:1, compare:1, radar:1, scatter:1, table:1, funnel:1, sensitivity:1, distribution:1, mapregions:1, mappoints:1, text:1 };
                for (i = 0; i < spec.views.length; i++) {
                    var v = spec.views[i];
                    if (!v.type || !viewTypes[v.type]) return "unknown view type '" + (v.type || '?') + "'";
                }
                return null;
            })();

            if (reason) {
                throw new Error("invalid simulation spec: " + reason
                    + ". Re-read render_datasimulator's description and call it again with a corrected spec.");
            }

            // --- repair mis-fielded views ---
            // The runtime binds value-views (metric/sparkline/progress/gauge) through view.value
            // and tables through view.columns (SimViews.js), but agents are unreliable about which
            // field carries the id: some put every binding under "series", some invent "expr", some
            // omit the binding entirely and only give a title. Any of those renders the tile as 0.
            // Fill the field the runtime actually reads from whatever the agent did supply, so the
            // view binds regardless. Non-destructive: only ever fills the correct field when absent,
            // and only ever binds to an id that actually exists in the model.
            (function() {
                var idOf = function(x) {
                    if (typeof x === 'string') return x;
                    if (x && typeof x === 'object' && typeof x.id === 'string') return x.id;
                    return null;
                };
                var firstId = function(v) {
                    if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) { var id = idOf(v[i]); if (id) return id; } return null; }
                    return idOf(v);
                };
                // Every real id in the model — a repaired binding must land on one of these.
                var knownIds = {};
                [].concat(spec.parameters || [], spec.state || [], spec.derived || []).forEach(function(it) {
                    if (it && typeof it.id === 'string') knownIds[it.id] = 1;
                });
                var slugify = function(t) {
                    return String(t).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                };
                var valueViews = { metric:1, sparkline:1, progress:1, gauge:1 };
                for (var i = 0; i < spec.views.length; i++) {
                    var v = spec.views[i];
                    if (!v || typeof v !== 'object') continue;

                    if (valueViews[v.type] && (v.value === undefined || v.value === null || v.value === '')) {
                        // In priority: series / values (id containers), then a bare-id expr, then a
                        // title whose slug is exactly a known id ("Monthly spend" -> monthly_spend).
                        var id = firstId(v.series !== undefined ? v.series : (v.values !== undefined ? v.values : v.columns));
                        if (!id && typeof v.expr === 'string' && knownIds[v.expr.trim()]) id = v.expr.trim();
                        if (!id && typeof v.title === 'string' && knownIds[slugify(v.title)]) id = slugify(v.title);
                        if (id) v.value = id;
                    } else if (v.type === 'table' && (!Array.isArray(v.columns) || v.columns.length === 0)) {
                        var src = Array.isArray(v.series) ? v.series : (Array.isArray(v.values) ? v.values : null);
                        if (src) {
                            var cols = [];
                            for (var j = 0; j < src.length; j++) { var cid = idOf(src[j]); if (cid) cols.push(cid); }
                            if (cols.length) v.columns = cols;
                        }
                    }
                }
            })();

            // --- normalize: drop derived nothing references (mirror stripUnusedDerived) ---
            if (spec.derived && Array.isArray(spec.derived) && spec.derived.length) {
                var viewStrings = {};
                var collect = function(node) {
                    if (typeof node === 'string') viewStrings[node] = 1;
                    else if (Array.isArray(node)) node.forEach(collect);
                    else if (node && typeof node === 'object') { for (var k in node) collect(node[k]); }
                };
                collect(spec.views);

                var esc = function(id) { return id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
                // Iterate to a fixpoint so chains fall too (a kept only by b, b unused).
                var removed = true;
                while (removed) {
                    removed = false;
                    for (var di = spec.derived.length - 1; di >= 0; di--) {
                        var d = spec.derived[di];
                        if (!d || !d.id || viewStrings[d.id]) continue;

                        var exprs = [];
                        (spec.rules || []).forEach(function(rr) { if (typeof rr.expr === 'string') exprs.push(rr.expr); });
                        (spec.state || []).forEach(function(ss) { if (typeof ss.init === 'string') exprs.push(ss.init); });
                        spec.derived.forEach(function(o, j) { if (j !== di && typeof o.expr === 'string') exprs.push(o.expr); });

                        var re = new RegExp('\\b' + esc(d.id) + '\\b');
                        var used = exprs.some(function(e) { return re.test(e); });
                        if (!used) { spec.derived.splice(di, 1); removed = true; }
                    }
                }
            }

            return JSON.stringify(spec);
        },
        recipeOutputKeys: ['simulation']
    },
    {
        mcpToolName: 'render_calendar',
        mcpDescription: `Create a calendar with events for schedules, appointments, holidays, and event planning.

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
        mcpInputSchema: {
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: 'MF_Calendar_ID',
        clientDataField: 'generatedtext',
        clientPrompt: 'calendar',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['calendar']
    },
    {
        mcpToolName: 'render_storyboard',
        imageSlots: true,
        imageSlotForm: 'imageID',
        imagesOnGuidance: `THIS RENDER INCLUDES AI-GENERATED IMAGERY - every frame gets its shot.
- Set coverType to "image" and coverFileID to "mfimg::" followed by a description of that frame's shot (no text, letters or numbers in the picture).
- Describe every frame in the SAME art style, so the sequence reads as one piece of film.`,
        imagesOffGuidance: `THIS RENDER HAS NO IMAGERY - coverType and coverFileID are null on every frame, and the written description carries the shot.`,
        mcpDescription: `Create a film/video storyboard with scenes and frames for visualizing stories, movie sequences, commercials, and video content.

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
- coverType / coverFileID: null, UNLESS you have been told this render includes images - then coverType is "image" and coverFileID is the image slot token for that frame's shot
- metadata: Object with field1-field4 for custom metadata (empty strings)
- comments: Empty array []
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
        mcpInputSchema: {
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
                                        coverType: { type: 'string', description: 'null, or "image" when this render includes images' },
                                        coverFileID: { type: 'string', description: 'null, or when this render includes images: "mfimg::" followed by a description of this frame\'s shot (no text, letters or numbers in it)' },
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: 'MF_StoryBoard_ID',
        clientDataField: 'generatedtext',
        clientPrompt: 'storyboard',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['storyboard']
    },
    {
        mcpToolName: 'render_database',
        mcpDescription: `Create database diagrams (ER diagrams) showing tables, columns, primary keys, foreign keys, and relationships.

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
        mcpInputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'A short title for the schema, shown as the frame header (e.g. "E-commerce Database").'
                },
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gendbdiagram',
        clientComp: null,
        // Fills an MF_DiagramFrame in place (its sendGenText routes gendbdiagram data).
        fillsComptype: 'MF_DiagramFrame',
        clientDataField: 'generateddbdiagram',
        clientPrompt: 'database',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['databasediagram']
    },
    {
        mcpToolName: 'render_swimlane',
        mcpDescription: `Create swimlane (cross-functional) diagrams with horizontal rows representing actors, departments, or roles, and flowchart nodes positioned within them.

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
- Default node colors by type: Processes "#bae6fd" (light blue), Decisions "#fde68a" (light yellow), Start/End "#bbf7d0" (light green), Data "#e9d5ff" (light purple)
- Keep node backgrounds light so black text stays readable. NEVER use dark node backgrounds unless the user explicitly asks for a "dark theme".
- If the prompt names a color theme/style, override these to match it while keeping backgrounds light enough for black text

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
        mcpInputSchema: {
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'genswimlane',
        clientComp: null,
        // Fills an MF_Swimlane_ID in place (its sendGenText reads data.generatedtext).
        fillsComptype: 'MF_Swimlane_ID',
        clientDataField: 'generatedtext',
        clientPrompt: 'swimlane',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['swimlanediagram']
    },

    {
        mcpToolName: 'render_timeline',
        // Real-world/current data component: the local agent may web-research first.
        webResearch: true,
        imageSlots: true,
        imageSlotForm: 'imageID',
        imagesOnGuidance: `THIS RENDER INCLUDES AI-GENERATED IMAGERY - each event gets a picture.
- Set coverType to "image" and coverFileID to "mfimg::" followed by a description of that event's picture (no text, letters or numbers in it).
- Keep one consistent visual style across the events.`,
        imagesOffGuidance: `THIS RENDER HAS NO IMAGERY - coverType and coverFileID are null on every event.`,
        mcpDescription: `Create a timeline for visualizing chronological events, milestones, history, evolution, or sequential stages. Use this for simple chronological visualization of events or milestones WITHOUT task management. For project plans with tasks, durations, progress, and assignees, use render_gantt instead.

FIRST, decide whether the topic is best represented with dates or labels:

DATE MODE (labelType: "date"):
- Use ONLY when you can assign real, accurate modern dates (AD/CE)
- When user explicitly provides dates in their prompt
- When topic is well-known modern history with documented dates (e.g., "Apple Inc history", "World War 2 timeline")
- When prompt contains extracted information with specific dates

LABEL MODE (labelType: "label"):
- When topic involves stages, steps, phases, processes, or abstract sequences (e.g., "stages of a butterfly", "steps to build a house")
- When events are conceptual or don't have universally known dates
- When user describes a process or workflow without specific dates
- When topic involves ancient history, prehistoric eras, or BC/BCE dates (use labels like "3300 BCE", "252 Million Years Ago")
- When unsure whether accurate dates exist — prefer labels over inventing dates

EVENT PROPERTIES:
- id: Unique string ID (e.g., "evt_1", "evt_2")
- title: Event or stage title
- description: Detailed description suitable for understanding the event
- date: ISO date string (real date for date mode, placeholder for label mode)
- labelValue: Empty string for date mode, meaningful label for label mode (e.g., "Stage 1", "Egg", "3300 BCE")
- coverType / coverFileID: null, UNLESS you have been told this render includes images - then coverType is "image" and coverFileID is the image slot token for that event's picture

SETTINGS:
- boardTitle: Meaningful title based on topic
- theme: "transparent"
- layout: "horizontal"
- labelType: "date" or "label" (based on decision above)

GUIDELINES:
- Create 5-10 events
- In date mode: events must have realistic dates sorted chronologically, labelValue should be empty string
- In label mode: labelValue must be a short meaningful label, date can be a placeholder
- Each event must have: id, title, description, date, labelValue, coverType, coverFileID
- Event IDs should be like: "evt_1", "evt_2", etc.
- Each event should have a meaningful title and detailed description

IMPORTANT: Always display the returned URL to the user.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                events: {
                    type: 'array',
                    description: 'Array of timeline events',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', description: 'Unique event ID (e.g., "evt_1")' },
                            title: { type: 'string', description: 'Event title' },
                            description: { type: 'string', description: 'Detailed event description' },
                            date: { type: 'string', description: 'ISO date string (real date for date mode, placeholder for label mode)' },
                            labelValue: { type: 'string', description: 'Empty string for date mode, meaningful label for label mode (e.g., "Stage 1", "3300 BCE")' },
                            coverType: { type: 'string', description: 'null, or "image" when this render includes images' },
                            coverFileID: { type: 'string', description: 'null, or when this render includes images: "mfimg::" followed by a description of this event\'s picture (no text, letters or numbers in it)' }
                        },
                        required: ['id', 'title', 'description', 'date', 'labelValue']
                    }
                },
                settings: {
                    type: 'object',
                    description: 'Timeline settings',
                    properties: {
                        boardTitle: { type: 'string', description: 'Title of the timeline' },
                        theme: { type: 'string', default: 'transparent' },
                        layout: { type: 'string', enum: ['horizontal', 'vertical'], default: 'horizontal' },
                        labelType: { type: 'string', enum: ['date', 'label'], description: '"date" for chronological events with real dates, "label" for stages/phases/abstract sequences' }
                    }
                }
            },
            required: ['events', 'settings']
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: 'MF_Timeline_ID',
        clientDataField: 'generatedtext',
        clientPrompt: 'timeline',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['timeline']
    },

    {
        mcpToolName: 'render_checklist',
        mcpDescription: `Create a checklist / to-do list of actionable tasks with checkboxes. Use this for task lists, action items, checklists, shopping lists, project task breakdowns, or any content organizing things that need to be completed. For status-column task boards use render_kanban; for scheduled tasks with durations use render_gantt.

STRUCTURE RULES:
- Output a single "title" string and a "data" array of task items
- title: A descriptive, engaging title summarizing the checklist topic (e.g., "Spring Home Maintenance Checklist")
- data: Array of 3-8 task items (not too few, not too many)

TASK ITEM PROPERTIES:
- item: Clear, actionable task description (required, never empty)
- checked: Boolean completion state - set false for all items unless the prompt clearly states a task is already done

CONTENT GUIDELINES:
- Items must be actionable, specific, achievable tasks that relate to the prompt - not general concepts
- Use clear, concise language; mix urgent and non-urgent tasks appropriately
- Every item must have content - never emit empty items`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Descriptive title for the checklist (e.g., "Weekly Shopping List", "New Product Launch - Project Tasks")'
                },
                data: {
                    type: 'array',
                    description: 'Array of checklist task items (3-8 recommended)',
                    items: {
                        type: 'object',
                        properties: {
                            item: { type: 'string', description: 'Clear, actionable task description' },
                            checked: { type: 'boolean', description: 'Completion state - false for all items unless already done', default: false }
                        },
                        required: ['item', 'checked']
                    }
                }
            },
            required: ['title', 'data']
        },
        clientAitype: 'gencomp',
        clientComp: 'MF_CheckList_ID',
        clientDataField: 'generatedtodo',
        clientPrompt: 'checklist',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['checklist']
    },
    {
        mcpToolName: 'render_poll',
        imageSlots: true,
        imageSlotForm: 'url',
        imagesOnGuidance: `THIS RENDER INCLUDES AI-GENERATED IMAGERY - illustrate the options.
- Include "optionImages" with one entry per option, index-aligned with options: "mfimg::" followed by a description of that choice.
- ALL options get one or none do - a half-illustrated poll reads as broken.`,
        imagesOffGuidance: `THIS RENDER HAS NO IMAGERY - omit "optionImages" entirely; the options carry themselves as words.`,
        mcpDescription: `Create a poll / voting question where users pick from predefined options. Use this for polls, surveys, opinion votes, multiple-choice questions, audience polls, feedback forms, or quick votes. For collecting AND upvoting open-ended ideas use render_upvoteideas; for a random picker use render_spinningwheel.

STRUCTURE RULES:
- Output a "question" string and an "options" array of 3-6 distinct string choices (2-8 allowed)
- question: A clear, engaging poll question
- options: Concise, mutually exclusive string choices that cover the topic; no duplicates, no empty strings
- Consider an "Other" or "Not sure" option when appropriate

OPTIONAL IMAGES:
- By DEFAULT this is a text poll: omit "optionImages" entirely. The options carry themselves as words.
- ONLY when you have been told this render includes images (or you have real image URLs to use), include "optionImages" with one entry per option, index-aligned with options - every option gets one or none get one, since a half-illustrated poll reads as broken. Never fabricate an image URL.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                question: {
                    type: 'string',
                    description: 'The poll question (e.g., "What is your favorite programming language?")'
                },
                options: {
                    type: 'array',
                    description: 'Array of 3-6 distinct, non-empty string options to vote on',
                    items: { type: 'string' }
                },
                optionImages: {
                    type: 'array',
                    description: 'OPTIONAL, index-aligned with options. When this render includes images, each entry is "mfimg::" followed by a description of that option\'s picture (no text, letters or numbers in it); otherwise a real image URL. Omit for a text poll.',
                    items: { type: 'string' }
                }
            },
            required: ['question', 'options']
        },
        clientAitype: 'gencomp',
        clientComp: 'MF_Poll_ID',
        clientDataField: 'generatedpoll',
        clientPrompt: 'poll',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['poll']
    },
    {
        mcpToolName: 'render_upvoteideas',
        mcpDescription: `Create an idea board where users submit and upvote ideas. Use this for idea lists, feature request boards, suggestion boxes, brainstorm lists, feedback boards, or any content where users vote up/down open-ended ideas or suggestions. For fixed multiple-choice voting use render_poll; for a random picker use render_spinningwheel.

STRUCTURE RULES:
- Output a "question" (board heading), an optional "title", and an "options" array of idea strings
- question: The board heading / prompt (e.g., "Product Improvement Ideas") - shown as the component title
- options: Array of 4-6 distinct idea strings (2-10 allowed); each 1-2 sentences, actionable, no duplicates, no empty strings

CONTENT GUIDELINES:
- Ideas should be distinct suggestions or feature requests that cover different aspects of the topic
- Keep each idea concise but descriptive enough to understand`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                question: {
                    type: 'string',
                    description: 'Board heading / prompt, shown as the component title (e.g., "Project Management Feature Ideas")'
                },
                title: {
                    type: 'string',
                    description: 'Optional title (same topic as question); used as a fallback heading'
                },
                options: {
                    type: 'array',
                    description: 'Array of 4-6 distinct idea strings that users can upvote',
                    items: { type: 'string' }
                }
            },
            required: ['question', 'options']
        },
        clientAitype: 'gencomp',
        clientComp: 'MF_UpvoteIdeas_ID',
        // the component's sendGenText reads gentext.data.generatedpoll
        clientDataField: 'generatedpoll',
        clientPrompt: 'upvoteideas',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['upvoteideas']
    },
    {
        mcpToolName: 'render_spinningwheel',
        mcpDescription: `Create a spinning wheel / random picker with labeled segments. Use this for prize wheels, decision wheels, random selectors, wheel-of-fortune games, icebreakers, or any wheel-based random choice tool. For structured voting use render_poll; for upvotable ideas use render_upvoteideas.

STRUCTURE RULES:
- Output a "title" string and an "options" array of segment labels
- title: A fun, engaging title for the wheel (e.g., "What's for Lunch?")
- options: Array of 4-8 short string segment labels (4-12 allowed); ideally 1-4 words each so they fit on a wheel segment

CONTENT GUIDELINES:
- Options should be distinct, readable, and relate to the prompt (decisions, games, prizes, random selection)
- No empty options; keep labels short`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Fun, engaging title for the spinning wheel (e.g., "What is for Lunch?")'
                },
                options: {
                    type: 'array',
                    description: 'Array of 4-8 short string segment labels (1-4 words each)',
                    items: { type: 'string' }
                }
            },
            required: ['title', 'options']
        },
        clientAitype: 'gencomp',
        clientComp: 'MF_SpinningWheel_ID',
        clientDataField: 'generatedwheel',
        clientPrompt: 'spinningwheel',
        clientPromptField: null,
        clientTransform: null,
        recipeOutputKeys: ['spinningwheel']
    },
    {
        mcpToolName: 'render_designframe',
        // Plan-picker badge join key, and the human word for this component in the
        // image ask + re-render prompt ("design", not "designframe").
        planUIType: 'design',
        imageSlots: true,
        imageSlotForm: 'imageID',
        imagesOnGuidance: `THIS RENDER INCLUDES AI-GENERATED IMAGERY - let photography anchor the layout.
- Prefer one dominant hero or product image with the type set over it or beside it, rather than several small pictures scattered about.
- Give the imagery its own area and keep the headline and body sizes as they are. If it does not fit, ENLARGE THE CANVAS - never shrink the type to make room for a picture.
- Text over a photo needs contrast: put a scrim block behind it, or set the type on a colour field beside the image.
- An image is an MF_ImageComp whose "img" is "mfimg::" followed by a plain description of the picture (no text, letters or numbers in it).`,
        imagesOffGuidance: `THIS RENDER HAS NO IMAGERY - colour, shape and type carry the piece.
- A full-bleed colour field, a bold type lockup or a geometric composition does the work the photograph would have done.
- Emit NO MF_ImageComp at all, and never leave an empty box where a photo would have gone.`,
        mcpDescription: `Create an editable graphic/marketing DESIGN inside a MockFlow IdeaBoard design frame (posters, flyers, banners, social posts, business cards, brand/slide layouts). For UI screens/wireframes use render_wireframelite; for brainstorming/strategy canvases use render_whiteboard. NOT a way to make a picture: this composes a multi-element design out of editable shapes and text, so "an image/photo/illustration of X" is render_image, not this tool, even though a design can contain imagery.

The design is a COMPRESSED component layout: an object { "components": { "c": [ ...components ] } } where each component uses short keys. Author real, positioned editable components.

REQUIRED KEYS PER COMPONENT: t (type), x, y, w, h, a (angle, 0), e (unique id).
COMPONENT TYPES: MF_Section / MF_Rectangle2 (color blocks, cards, background container - the full-bleed background block should be first), MF_Text (headings, body, labels: tx text, ta align, fs size, fcl color, fw weight), MF_Ellipse2 (circles/dots), MF_ImageComp (photos, when this render includes imagery - you are told which mode you are in).
STYLE KEYS: fc (fill colors array e.g. ["#2563eb","#2563eb"]), ft "solid", tx (text), fcl (font color), fs (font size), fw ("bold"/"normal"), ta ("left"/"center"/"right"), fnt "sourcesanspro".

GEOMETRY (your x/y/w/h are used verbatim, so author a finished canvas):
- Coordinates are canvas-relative and start at 0,0. The FIRST component is the background: x 0, y 0, w/h = the full canvas.
- Choose a canvas size for the medium and keep EVERY component fully inside it: no part of any component (x, y, x+w, y+h) may fall outside the canvas. Typical sizes: Instagram post 1080x1080, story 1080x1920, Facebook cover 1920x1080, business card 1050x600, poster/flyer 1080x1350, A4 595x842, logo 400x400, website hero 1920x600, email header 600x200, YouTube thumbnail 1280x720.
- Do NOT overlap components unless the overlap is deliberate (text sitting on its own background block). Plan a grid or column layout before emitting JSON and keep 10-20px between neighbours.
- SIZE TEXT BOXES TO THEIR CONTENT. Text that does not fit its w/h is auto-shrunk on the board (down to 5px), so a heading in an undersized box renders unreadably small. Budget about fs * 1.6 of height per line of text and enough width for the longest line plus padding.
- Font sizes: headlines 32-72, subheads 20-32, body 14-18, captions 10-14.
- SET fs AND fnt ON EVERY COMPONENT THAT HAS TEXT. Without them the piece renders at one default size in one default face, which reads as flat and unfinished. Vary weight and size to build the hierarchy.
- Set border width (bw) to 0 on any component that touches a canvas edge.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'A short title shown as the frame header (e.g. "Q3 Campaign Poster").'
                },
                components: {
                    type: 'object',
                    description: "Compressed design layout with 'c' array of components (MF_Section, MF_Rectangle2, MF_Text, MF_Ellipse2, and MF_ImageComp when images were requested).",
                    properties: {
                        c: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    t: { type: 'string', description: 'Component type (MF_Section, MF_Rectangle2, MF_Text, MF_Ellipse2, MF_ImageComp)' },
                                    x: { type: 'number' }, y: { type: 'number' },
                                    w: { type: 'number' }, h: { type: 'number' },
                                    a: { type: 'number', description: 'Angle, always 0' },
                                    e: { type: 'string', description: 'Unique element ID' },
                                    tx: { type: 'string' },
                                    ta: { type: 'string', enum: ['left', 'center', 'right', 'justify'], description: 'Text alignment' },
                                    fs: { type: 'number', description: 'REQUIRED on any component with text. Font size in px, full range 6-500: hero/display 48-120, subtitles 24-36, body 14-18, labels 10-14. Leaving it out renders every word at the same small default.' },
                                    fcl: { type: 'string', description: 'Font colour, hex. Must contrast with whatever sits behind it.' },
                                    fw: { type: 'string', enum: ['normal', 'bold', '200', '300', '600', '900'], description: 'Font weight - vary it to build hierarchy' },
                                    fst: { type: 'string', enum: ['normal', 'italic'] },
                                    td: { type: 'string', enum: ['none', 'underline', 'line-through'] },
                                    fnt: { type: 'string', description: 'REQUIRED on any component with text. A Google Font family name chosen for the mood (e.g. "Playfair Display", "Inter", "Bebas Neue"). Omitting it gives every board the same default face.' },
                                    lh: { type: 'number', description: 'Line height multiplier: tight for headlines (0.8-1.0), looser for body (1.2-1.6)' },
                                    cs: { type: 'number', description: 'Letter spacing in px, -10 to 100 - useful for display type' },
                                    pd: { type: 'number', description: 'Padding in px' },
                                    fc: { type: 'array', items: { type: 'string' }, description: 'Fill colours [from, to] - two hex values (repeat the same one for a flat fill)' },
                                    ft: { type: 'string', enum: ['solid', 'linear-vertical', 'linear-horizontal', 'linear-diagonally', 'radial', 'none'], description: 'Fill type' },
                                    fa: { type: 'number', description: 'Fill opacity 0-1' },
                                    st: { type: 'string', enum: ['none', 'drop-shadow', 'inner-shadow', 'glow'], description: 'Shadow' },
                                    br: { type: 'array', items: { type: 'number' }, description: 'Corner radii [all, tl, tr, br, bl] in px (MF_Section / MF_Rectangle2)' },
                                    bw: { type: 'array', items: { type: 'number' }, description: 'Border widths [all, top, right, bottom, left] - use 0 on anything touching a canvas edge' },
                                    bt: { type: 'array', items: { type: 'string' }, description: 'Border types [all, top, right, bottom, left]: none | solid | dashed | dotted' },
                                    bc: { type: 'array', items: { type: 'string' }, description: 'Border colours [all, top, right, bottom, left], hex' },
                                    img: { type: 'string', description: 'MF_ImageComp only, and only when this render includes images: "mfimg::" followed by a description of the picture (no text, letters or numbers in it).' }
                                },
                                required: ['t', 'x', 'y', 'w', 'h', 'e']
                            }
                        }
                    },
                    required: ['c']
                }
            },
            required: ['components']
        },
        clientAitype: 'gendesigner2',
        clientComp: null,
        fillsComptype: 'MF_DesignFrame_ID',
        clientDataField: 'generatedui',
        clientPrompt: 'design',
        clientPromptField: null,
        clientTransform: function(args) {
            // Carry the frame title inside the compressed layout so the client
            // (optimizer.applyModification -> compdata.title) labels the frame,
            // exactly like server-generated frames.
            var layout = args.components || args || {};
            if (args.title && !layout.title) { try { layout.title = args.title; } catch (e) {} }
            var s = '';
            try { s = JSON.stringify(layout); } catch (e) {}
            // initoffset mirrors gendesigner2: the layout's coordinates are canvas-relative,
            // so the client (optimizer.generateLayout) must translate them by the board's
            // init offset. Without it the children are created at raw canvas coordinates
            // near the board origin while the frame is created at the init offset.
            return { dataValue: s, extraDataFields: { isCompressed: true, initoffset: true, container: true } };
        },
        recipeOutputKeys: ['design']
    },
    {
        mcpToolName: 'render_moodframe',
        // Plan-picker badge join key (AI_REGISTRY multiBoardType) for tools whose
        // comptype join misses (pseudo/fills-many comptypes).
        planUIType: 'moodboard',
        imageSlots: true,
        imageSlotForm: 'imageID',
        imagesOnGuidance: `THIS RENDER INCLUDES AI-GENERATED IMAGERY - compose the board around it.
- Photo tiles are the dominant element, typically covering a good half of the canvas, with swatches and type arranged in the space between them.
- Vary their size: one or two large anchor images with smaller supporting tiles reads like a moodboard; a uniform grid of equal squares does not.
- Keep the typography at the sizes above. If the tiles and the type do not both fit, ENLARGE THE CANVAS - never shrink a text box or a font size to make room for a picture.
- A tile is an MF_ImageComp whose "img" is "mfimg::" followed by a plain description of the picture (no text, letters or numbers in it). At most 6; use colour blocks for any further visual areas.`,
        imagesOffGuidance: `THIS RENDER HAS NO IMAGERY - colour and type ARE the board.
- Carry the whole mood with large colour fields, oversized display words and keyword tiles.
- Emit NO MF_ImageComp at all. Where a photo would have gone, put a colour field or a type lockup - never a gap or an empty placeholder box.`,
        mcpDescription: `Create a mood/inspiration board inside a MockFlow IdeaBoard mood frame: color palette swatches, typography specimens, keyword/mood text tiles, and photographic image tiles. NOT a way to make a picture: this composes a whole board of swatches, type and tiles, so "an image/photo of X" is render_image, not this tool, even though a moodboard can contain imagery.

Compressed component layout { "components": { "c": [ ... ] } }. Convey the mood through:
- MF_Rectangle2 / MF_Section color-swatch blocks (fc fill array) arranged as a palette.
- MF_Text typography specimens (large display words) and keyword tiles (fs size, fcl color, fw weight, fnt).
- MF_ImageComp photo tiles - ONLY when you have been told this render includes images. By default emit none and carry the whole mood with color and type.

REQUIRED KEYS PER COMPONENT: t, x, y, w, h, a (0), e.

GEOMETRY (your x/y/w/h are used verbatim, so author a finished canvas):
- Coordinates are canvas-relative and start at 0,0. Use MF_Section exactly ONCE, as the FIRST component, at x 0, y 0 with w/h = the full canvas: it is the background all other components sit on, and its tx must be "".
- Choose a canvas size and keep EVERY component fully inside it: no part of any component (x, y, x+w, y+h) may fall outside the canvas. Typical sizes: standard moodboard 1200x800, Pinterest style 735x1102, square 1080x1080, portrait 800x1200, collage 1000x1000.
- NO OVERLAPPING: before placing a component check that its bounding box does not intersect any already-placed one, and leave at least 10px between neighbours. Plan a grid or column layout before emitting JSON.
- SIZE TEXT BOXES TO THEIR CONTENT. Text that does not fit its w/h is auto-shrunk on the board (down to 5px), so a display word in an undersized box renders unreadably small. Budget about fs * 1.6 of height per line and enough width for the longest line plus padding.
- Font sizes: hero/display 48-120, subtitles 24-36, body 14-18, labels 10-14.
- SET fs AND fnt ON EVERY COMPONENT THAT HAS TEXT. They are not optional niceties: a component without them renders at the default size in the default face, which is what a flat, tiny-text board looks like. Vary the sizes hard (a 96px display word next to 12px labels) and pick fonts that carry the mood.
- MF_ColorCode_ID is the proper palette swatch (selectedColor + showHexCode); use it for colour chips rather than drawing bare rectangles.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'A short title shown as the frame header (e.g. "Brand Mood Board").'
                },
                components: {
                    type: 'object',
                    description: "Compressed moodboard layout with 'c' array (MF_Rectangle2/MF_Section color swatches, MF_Text specimens/keywords, and MF_ImageComp photo tiles when images were requested).",
                    properties: {
                        c: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    t: { type: 'string', description: 'MF_Rectangle2, MF_Section, MF_Text, MF_ColorCode_ID, or MF_ImageComp' },
                                    x: { type: 'number' }, y: { type: 'number' },
                                    w: { type: 'number' }, h: { type: 'number' },
                                    a: { type: 'number', description: 'Angle, always 0' },
                                    e: { type: 'string' },
                                    tx: { type: 'string' },
                                    ta: { type: 'string', enum: ['left', 'center', 'right', 'justify'], description: 'Text alignment' },
                                    fs: { type: 'number', description: 'REQUIRED on any component with text. Font size in px, full range 6-500: hero/display 48-120, subtitles 24-36, body 14-18, labels 10-14. Leaving it out renders every word at the same small default.' },
                                    fcl: { type: 'string', description: 'Font colour, hex. Must contrast with whatever sits behind it.' },
                                    fw: { type: 'string', enum: ['normal', 'bold', '200', '300', '600', '900'], description: 'Font weight - vary it to build hierarchy' },
                                    fst: { type: 'string', enum: ['normal', 'italic'] },
                                    td: { type: 'string', enum: ['none', 'underline', 'line-through'] },
                                    fnt: { type: 'string', description: 'REQUIRED on any component with text. A Google Font family name chosen for the mood (e.g. "Playfair Display", "Inter", "Bebas Neue"). Omitting it gives every board the same default face.' },
                                    lh: { type: 'number', description: 'Line height multiplier: tight for headlines (0.8-1.0), looser for body (1.2-1.6)' },
                                    cs: { type: 'number', description: 'Letter spacing in px, -10 to 100 - useful for display type' },
                                    pd: { type: 'number', description: 'Padding in px' },
                                    fc: { type: 'array', items: { type: 'string' }, description: 'Fill colours [from, to] - two hex values (repeat the same one for a flat fill)' },
                                    ft: { type: 'string', enum: ['solid', 'linear-vertical', 'linear-horizontal', 'linear-diagonally', 'radial', 'none'], description: 'Fill type' },
                                    fa: { type: 'number', description: 'Fill opacity 0-1' },
                                    st: { type: 'string', enum: ['none', 'drop-shadow', 'inner-shadow', 'glow'], description: 'Shadow' },
                                    br: { type: 'array', items: { type: 'number' }, description: 'Corner radii [all, tl, tr, br, bl] in px (MF_Section / MF_Rectangle2)' },
                                    bw: { type: 'array', items: { type: 'number' }, description: 'Border widths [all, top, right, bottom, left] - use 0 on anything touching a canvas edge' },
                                    bt: { type: 'array', items: { type: 'string' }, description: 'Border types [all, top, right, bottom, left]: none | solid | dashed | dotted' },
                                    bc: { type: 'array', items: { type: 'string' }, description: 'Border colours [all, top, right, bottom, left], hex' },
                                    selectedColor: { type: 'string', description: 'MF_ColorCode_ID only: the swatch colour, hex' },
                                    showHexCode: { type: 'boolean', description: 'MF_ColorCode_ID only: print the hex value under the swatch' },
                                    shapeType: { type: 'string', enum: ['full', 'circle', 'square'], description: 'MF_ColorCode_ID only: swatch shape' },
                                    img: { type: 'string', description: 'MF_ImageComp only, and only when this render includes images: "mfimg::" followed by a description of the picture (no text, letters or numbers in it).' }
                                },
                                required: ['t', 'x', 'y', 'w', 'h', 'e']
                            }
                        }
                    },
                    required: ['c']
                }
            },
            required: ['components']
        },
        clientAitype: 'genmoodboard',
        clientComp: null,
        fillsComptype: 'MF_MoodFrame_ID',
        clientDataField: 'generatedui',
        clientPrompt: 'moodboard',
        clientPromptField: null,
        clientTransform: function(args) {
            // Carry the frame title inside the compressed layout so the client
            // (optimizer.applyModification -> compdata.title) labels the frame,
            // exactly like server-generated frames.
            var layout = args.components || args || {};
            if (args.title && !layout.title) { try { layout.title = args.title; } catch (e) {} }
            var s = '';
            try { s = JSON.stringify(layout); } catch (e) {}
            // initoffset mirrors genmoodboard: the layout's coordinates are canvas-relative,
            // so the client (optimizer.generateLayout) must translate them by the board's
            // init offset. Without it the children are created at raw canvas coordinates
            // near the board origin while the frame is created at the init offset.
            return { dataValue: s, extraDataFields: { isCompressed: true, initoffset: true, container: true } };
        },
        recipeOutputKeys: []
    },
    {
        mcpToolName: 'render_whiteboardframe',
        // Plan-picker badge join key (AI_REGISTRY multiBoardType) for tools whose
        // comptype join misses (pseudo/fills-many comptypes).
        planUIType: 'whiteboard',
        mcpDescription: `Create a whiteboard WRAPPED IN a MockFlow IdeaBoard whiteboard frame (a single framed board component), for brainstorming and strategy canvases: sticky notes, sections, and named frameworks (SWOT, retro, empathy map, business model canvas, matrices). Differs from render_whiteboard, which drops the same content as LOOSE components on the canvas rather than inside a frame.

Compressed layout { "components": { "c": [ ... ] } }:
- MF_Section: container areas (tx title, fc pastel fill e.g. ["#f0f8ff","#f0f8ff"]).
- MF_Note2: sticky notes (tx text, fc e.g. ["#fbf4a4","#fbf4a4"]).
- MF_Text: labels/headers.
REQUIRED KEYS: t, x, y, w, h, a (0), e.

GEOMETRY (your x/y/w/h are used verbatim, so author a finished canvas):
- Coordinates are canvas-relative and start at 0,0.
- Choose a canvas size for the activity and keep EVERY component fully inside it: no part of any component (x, y, x+w, y+h) may fall outside the canvas. Typical sizes: small brainstorm 1200x800, medium brainstorm 1600x1200, large workshop 2000x1400, timeline/process 2400x900, mind map 1500x1200, project planning 1800x1200.
- Do NOT overlap components: a note belongs beside its siblings inside its section's bounds, never on top of one. Lay the sections out on a grid before emitting JSON.
- Sizes: MF_Section 300-800 wide by 200-600 high, MF_Note2 120-200 wide by 80-150 high. Leave 20-50px between sections and 10-20px between notes.
- SIZE TEXT TO ITS CONTENT. Text that does not fit its w/h is auto-shrunk on the board (down to 5px), so a long note in a small box renders unreadably small. Budget about fs * 1.6 of height per line and enough width for the longest line plus padding. Section titles 16-24, note text 12-16.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'A short title shown as the frame header (e.g. "Sprint Retro Board").'
                },
                components: {
                    type: 'object',
                    description: "Compressed whiteboard layout with 'c' array (MF_Section, MF_Note2, MF_Text).",
                    properties: {
                        c: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    t: { type: 'string', description: 'MF_Section, MF_Note2, or MF_Text' },
                                    x: { type: 'number' }, y: { type: 'number' },
                                    w: { type: 'number' }, h: { type: 'number' },
                                    a: { type: 'number', description: 'Angle, always 0' },
                                    e: { type: 'string' },
                                    tx: { type: 'string', description: 'Text content: the note, the label, the section title' },
                                    ta: { type: 'string', enum: ['left', 'center', 'right', 'justify'] },
                                    fs: { type: 'number', description: 'REQUIRED on anything with text. Font size in px: section titles 16-24, note text 12-16, board headings larger. Omit it and every word renders at the same default size.' },
                                    fcl: { type: 'string', description: 'Font colour, hex - dark text on a light sticky, light on a dark section' },
                                    fw: { type: 'string', enum: ['normal', 'bold', '200', '300', '600', '900'] },
                                    fst: { type: 'string', enum: ['normal', 'italic'] },
                                    td: { type: 'string', enum: ['none', 'underline', 'line-through'] },
                                    fnt: { type: 'string', description: 'REQUIRED on anything with text. A Google Font family name; keep to one or two across the board.' },
                                    lh: { type: 'number', description: 'Line height multiplier, 1.2-1.5 keeps notes readable' },
                                    tp: { type: 'number', description: 'MF_Note2: padding inside the sticky, 8-15' },
                                    fold: { type: 'boolean', description: 'MF_Note2: the folded-corner effect' },
                                    fc: { type: 'array', items: { type: 'string' }, description: 'Fill colours [from, to] - sticky colours like ["#fbf4a4","#fbf4a4"], pastel sections' },
                                    ft: { type: 'string', enum: ['solid', 'linear-vertical', 'linear-horizontal', 'linear-diagonally', 'radial', 'none'] },
                                    fa: { type: 'number', description: 'Fill opacity 0-1' },
                                    st: { type: 'string', description: 'Shadow: none | drop-shadow | inner-shadow | glow (a soft drop shadow suits notes)' },
                                    br: { type: 'array', items: { type: 'number' }, description: 'Corner radii [all, tl, tr, br, bl]' },
                                    bw: { type: 'array', items: { type: 'number' }, description: 'Border widths [all, top, right, bottom, left]' },
                                    bt: { type: 'array', items: { type: 'string' }, description: 'Border types [all, top, right, bottom, left]' },
                                    bc: { type: 'array', items: { type: 'string' }, description: 'Border colours [all, top, right, bottom, left]' }
                                },
                                required: ['t', 'x', 'y', 'w', 'h', 'e']
                            }
                        }
                    },
                    required: ['c']
                }
            },
            required: ['components']
        },
        clientAitype: 'genwhiteboard',
        clientComp: null,
        fillsComptype: 'MF_WhiteboardFrame_ID',
        clientDataField: 'generatedui',
        clientPrompt: 'whiteboard',
        clientPromptField: null,
        clientTransform: function(args) {
            // Carry the frame title inside the compressed layout so the client
            // (optimizer.applyModification -> compdata.title) labels the frame,
            // exactly like server-generated frames.
            var layout = args.components || args || {};
            if (args.title && !layout.title) { try { layout.title = args.title; } catch (e) {} }
            var s = '';
            try { s = JSON.stringify(layout); } catch (e) {}
            // initoffset mirrors genwhiteboard: the layout's coordinates are canvas-relative,
            // so the client (optimizer.generateLayout) must translate them by the board's
            // init offset. Without it the children are created at raw canvas coordinates
            // near the board origin while the frame is created at the init offset.
            return { dataValue: s, extraDataFields: { isCompressed: true, initoffset: true, container: true } };
        },
        recipeOutputKeys: []
    },
    // ========================================================================
    // Media components — the asset IS the component (a picture, a video clip, a
    // sound, a 3D model). A local text agent cannot produce any of them, so it
    // writes the PROMPT and MockFlow AI generates the asset in the user's own
    // browser through the generator that surface already uses, on their credits.
    //
    // `clientServerGenerate` is what says so: the tab runs that MockFlow
    // generator with these args instead of drawing the component itself, exactly
    // as the AI Prompt Box does for the same output type. `mediaComponent` makes
    // the user confirm the spend first, since the whole component costs credits.
    // ========================================================================
    {
        mcpToolName: 'render_image',
        mediaComponent: true,
        mcpDescription: `Generate a standalone picture - an illustration, photo, artwork, icon or logo - and place it on the board as an image component. Use this whenever the user asks for an image/picture/photo/illustration of something.

NOT for a design, poster or social post laid out from shapes and text (render_designframe), a UI screen (render_wireframelite), or a mood/inspiration board (render_moodframe) - those compose many components and can contain imagery, but they are not a picture.

The picture is generated by MockFlow AI in the user's browser, not by you: write a vivid, self-contained prompt describing the subject, composition, lighting and art style, and call this once. The user confirms the spend before it runs, and the image appears on their board when it is ready - never output a URL, and do not wait for one.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'What the picture shows: subject, composition, lighting and art style, in one self-contained sentence or two. Avoid asking for text, letters or numbers inside the image.'
                }
            },
            required: ['prompt']
        },
        clientServerGenerate: true,
        mediaComptype: 'MF_ImageComp',
        clientAitype: 'genideaboard',
        clientToComp: 'Image',
        clientPromptPrefix: 'Generate an image: ',
        // The image component is filled from a STORED asset id, so the generator
        // must upload rather than hand back a temporary url (genimage.js). The
        // in-app callers get that from fromconvert; this one has no source
        // component to convert from, so it asks for it directly.
        clientGenExtra: { persistimage: true },
        clientComp: null,
        recipeOutputKeys: []
    },
    {
        mcpToolName: 'render_video',
        mediaComponent: true,
        mcpDescription: `Generate a short video clip - animation, motion graphics, cinematic or any moving content - and place it on the board as a video player component.

NOT for a shot-by-shot plan of a video (render_storyboard) and NOT for the look and feel of one (render_moodframe).

The clip is generated by MockFlow AI in the user's browser, not by you: write a vivid, self-contained prompt describing the scene, motion, camera and style, and call this once. Video is one of the most expensive things MockFlow generates, so the user confirms the spend before it runs; the clip appears on their board when it is ready - never output a URL, and do not wait for one.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'What happens in the clip: scene, subject, motion, camera movement and visual style, in one self-contained description.'
                }
            },
            required: ['prompt']
        },
        clientServerGenerate: true,
        mediaComptype: 'MF_VideoPlayer_ID',
        clientAitype: 'genvideo',
        clientToComp: 'MF_VideoPlayer_ID',
        clientComp: null,
        recipeOutputKeys: []
    },
    {
        mcpToolName: 'render_audio',
        mediaComponent: true,
        mcpDescription: `Generate sound to listen to - music, a sound effect, speech, voiceover, narration or a jingle - and place it on the board as an audio player component.

NOT for a UI mockup of a music or podcast app (render_wireframelite), and NOT for a written script (render_markdown).

The audio is generated by MockFlow AI in the user's browser, not by you: write a self-contained prompt describing the sound, mood, instruments or voice, and for speech include the exact words to be spoken. Call this once. The user confirms the spend before it runs, and the clip appears on their board when it is ready - never output a URL, and do not wait for one.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'What the audio is: music style, mood and instruments, or for speech the exact words plus the voice and delivery.'
                }
            },
            required: ['prompt']
        },
        clientServerGenerate: true,
        mediaComptype: 'MF_AudioPlayer_ID',
        clientAitype: 'genaudio',
        clientToComp: 'MF_AudioPlayer_ID',
        clientComp: null,
        recipeOutputKeys: []
    },
    {
        mcpToolName: 'render_3dmodel',
        mediaComponent: true,
        mcpDescription: `Generate an actual 3D model - an object, character, prop or scene mesh (GLB/GLTF) - and place it on the board as a 3D model viewer component.

NOT for isometric or "3D-looking" diagrams, flowcharts or shapes (render_flowchart with category "3d") - this makes a real 3D asset the user can rotate.

The model is generated by MockFlow AI in the user's browser, not by you: write a self-contained prompt describing the object, its form, materials and style, and call this once. 3D is one of the most expensive things MockFlow generates, so the user confirms the spend before it runs; the model appears on their board when it is ready - never output a URL, and do not wait for one.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'The object to model: what it is, its form and proportions, materials, colours and style.'
                }
            },
            required: ['prompt']
        },
        clientServerGenerate: true,
        mediaComptype: 'MF_3DModelViewer_ID',
        clientAitype: 'gen3dmodel',
        clientToComp: 'MF_3DModelViewer_ID',
        clientComp: null,
        recipeOutputKeys: []
    },

    // ========================================================================
    // plan_board — Declare a multi-part board plan BEFORE drawing (bridge-native:
    // handled by the MockFlow Bridge like layout_board; the hosted server rejects
    // non-render tools gracefully). Arms the plan-first pipeline: the bridge counts
    // the following draws and auto-arranges the batch (bento + titled section) when
    // every planned item has been rendered — the MockFlow AI multiboard flow.
    // ========================================================================
    {
        mcpToolName: 'plan_board',
        // The "plan" choice in the bridge's deciding step. Every render_* option in that
        // menu states its own purpose, so leaving this one undescribed made it the option
        // nobody picks: the whole-product case (one wireframe per screen) is exactly what
        // the server multiboard classifier calls multi, and it has to say so here too.
        mcpDeclareLine: 'Several DIFFERENT components at once: a workspace, dashboard or kit, OR one wireframe screen per surface of a whole app, site, product flow or multi-page site. Building a product out of static screens belongs here.',
        mcpDescription: `Propose a multi-part board plan and END YOUR TURN. Call this when a request needs several DIFFERENT components - a plan, workspace, dashboard or kit - listing every component with the render_* tool that draws it and a self-contained brief.

ONE COMPONENT WINS OVER A PLAN. Before planning, check whether a single render_* tool already covers the whole request: if one does, call that tool directly and do not plan. A component that is itself multi-part - many screens, scenes, frames, steps or sections inside ONE artifact - is still one component, so a request for that artifact is one render call however many parts it contains. Only split a request into a plan when no single component can carry it.

The list is shown to the user on their board to confirm or trim. When they click Generate Board, the chosen items are generated FROM YOUR BRIEFS and arranged automatically - all without you. So after this call: do not render anything, do not call any more tools; just tell the user to review the list and click Generate Board. Any render call you make while they are choosing is refused.

Guidelines:
- Break the request into the components a product team would expect (e.g. a launch plan: kanban + timeline + mindmap; a request to WIREFRAME a multi-screen app: one wireframe per screen).
- Each brief must stand alone (the generator sees ONLY the briefs, not this conversation): what the component shows, the actual content/data or how to derive it, and for screens the device, viewport width and visual style.
- Multi-screen wireframes/apps: one render_wireframelite item PER SCREEN; give every screen brief the same design system and the SAME viewportWidth so the screens come out matching.
- NEVER ask a generator to fabricate specific real-world data the user did not provide - no invented vendor/company names, people, phone numbers, email addresses, URLs, prices or contact details. For tables and spreadsheets, describe the STRUCTURE and CATEGORIES ("columns: Item, Estimated Cost, Priority") and say to use neutral placeholder labels ("Item 1", "Vendor A") rather than inventing realistic-sounding entities.

CHARTS DATA GATE - only include a render_chart item when the request actually carries concrete quantitative data (specific numbers, percentages, amounts, counts, time-series, or measurable comparisons) belonging to this board's topic, OR when the user explicitly asks for a chart. Do NOT add a chart just to diversify the board: a chart populated with invented numbers is misleading, so when no real data is available, omit charts entirely and pick a non-numeric visual instead. When you do include one, embed the real data points verbatim in its brief and say what goes on each axis.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                boardTitle: {
                    type: 'string',
                    description: 'Title for the board section wrapping the batch (e.g. "Mobile App Launch Plan", "CRM App Screens")'
                },
                items: {
                    type: 'array',
                    minItems: 2,
                    description: 'Every component of the plan, in generation order.',
                    items: {
                        type: 'object',
                        properties: {
                            tool: { type: 'string', description: 'The render_* tool that draws this item (e.g. render_kanban, render_wireframelite)' },
                            name: { type: 'string', description: 'Short name of the item (e.g. "Launch tasks", "Login screen")' },
                            brief: { type: 'string', description: 'Self-contained spec the item is generated from after the user confirms (the generator sees only this, not the conversation): content, real data or how to derive it, device/viewportWidth and style for screens.' }
                        },
                        required: ['tool', 'name', 'brief']
                    }
                }
            },
            required: ['boardTitle', 'items']
        },
        clientAitype: null,
        clientComp: null,
        clientDataField: null,
        clientPrompt: null,
        clientPromptField: null,
        clientTransform: null
    },
    // ========================================================================
    // layout_board — Arrange recently created components in bento layout
    // ========================================================================
    {
        mcpToolName: 'layout_board',
        mcpDescription: 'IMPORTANT: After creating 2 or more visualizations using individual render_* tools, call this tool to arrange them in a professional bento-box grid layout with a titled section wrapper.\n\nWorkflow:\n1. Call render_kanban, render_gantt, render_mindmap etc. one by one\n2. Call layout_board with a title to arrange everything neatly\n\nThis tool takes all recently created components (since the last layout_board call) and arranges them in rows, wrapped in a titled section.\n\nALWAYS call this after creating multiple visualizations - EXCEPT when you declared the batch with plan_board first: an active plan arranges the board automatically after the last planned item, so do not also call this.',
        mcpInputSchema: {
            type: 'object',
            properties: {
                boardTitle: {
                    type: 'string',
                    description: 'Title for the board section (e.g., "Mobile App Launch Plan", "Q2 Marketing Strategy")'
                }
            },
            required: ['boardTitle']
        },
        clientAitype: null,
        clientComp: null,
        clientDataField: null,
        clientPrompt: null,
        clientPromptField: null,
        clientTransform: null
    }
];

// ============================================================================
// Content grounding
// ============================================================================
/**
 * The anti-fabrication rule, authored ONCE and appended to every content-bearing
 * render_* description below.
 *
 * WHY THIS LIVES HERE: MockFlow's own server generators each carry their own copy
 * of this rule (gentable.js, gendatagrid.js, genspreadsheet.js, genkanban.js,
 * genboardplan.js) because they write the component themselves. An agent driving
 * these MCP tools never runs those generators - it authors the values from the
 * tool description alone - so without this clause it has the schema but none of
 * the content rules, and invents realistic-looking people, vendors and figures.
 *
 * Deliberately capability-conditional and tool-agnostic: this text is read by the
 * bridge, the hosted and desktop MCP servers, the Slack and GPT-action generators,
 * and by third-party agents (Cursor, Codex, ...). It must never name a specific
 * agent's web-search tool, or an agent without one is told to call something that
 * does not exist.
 */
var CONTENT_GROUNDING = `

CONTENT GROUNDING (applies to every value you generate):
- Do NOT fabricate specific real-world data the user did not provide: no invented person names, company/vendor/brand names, phone numbers, email addresses, URLs, street addresses, prices, or statistics.
- Use neutral placeholders instead ("Vendor A", "Item 1", "Guest 1", "person@example.com"), or well-known public facts.
- Only include specific real-world entities when the user named them, or when you researched them and they are real.
- Never present invented numbers as if they were real data. If a request needs data you do not have, generate the STRUCTURE (headings, columns, categories) and leave placeholder values.
- If you can research the web and the request depends on real-world or current facts, ground it first. If you have no research capability, generate from your own knowledge and keep unknown specifics as placeholders - never stop, and never fill the gap with invented detail.`;

/**
 * Design surfaces are exempt: a wireframe or prototype of a contacts screen is
 * SUPPOSED to show plausible sample rows - that is what a mockup is - and their
 * server generators carry no such rule either. The clause targets data-bearing
 * components (tables, spreadsheets, kanban, checklists, charts, ...), which is
 * where invented content reads as fact rather than as a placeholder.
 */
var GROUNDING_EXEMPT = [
    'render_wireframelite',
    'render_prototypelite',
    'render_designframe',
    'render_moodframe',
    'render_whiteboardframe'
];

// Applied at definition time, so EVERY consumer of the catalog gets it with no
// change on their side: getToolDefinitions (bridge + MCP servers) and the paths
// that read entry.mcpDescription directly as a generation prompt
// (integrationAPIManager, slackManager). Appended at the end, so readers that
// summarise with .split('\n')[0] are unaffected.
for (var _gi = 0; _gi < IDEABOARD_MCP_REGISTRY.length; _gi++) {
    var _ge = IDEABOARD_MCP_REGISTRY[_gi];
    if (typeof _ge.mcpToolName !== 'string' || _ge.mcpToolName.indexOf('render_') !== 0) continue;
    if (GROUNDING_EXEMPT.indexOf(_ge.mcpToolName) !== -1) continue;
    _ge.mcpDescription = String(_ge.mcpDescription || '') + CONTENT_GROUNDING;
}

// Helper: build tool definitions array for MCP servers.
//
// `bridgeOnly` entries are left out unless the caller asks for them
// (getToolDefinitions({ bridge: true })). Such a tool edits a component the user
// has open in a connected editor tab, using state only that tab holds - so it is
// meaningful to the MockFlow Bridge and to nobody else. Listing it for the hosted
// or desktop MCP servers would offer an agent a tool that cannot run there. An
// older bridge simply calls this with no argument and never sees it, which is the
// right outcome: it would not know how to route it either.
IDEABOARD_MCP_REGISTRY.getToolDefinitions = function(opts) {
    var wantBridge = !!(opts && opts.bridge);
    return this.filter(function(entry) {
        return wantBridge || !entry.bridgeOnly;
    }).map(function(entry) {
        return {
            name: entry.mcpToolName,
            description: entry.mcpDescription,
            inputSchema: entry.mcpInputSchema
        };
    });
};

// Helper: map MCP tool call to showResults gdata
IDEABOARD_MCP_REGISTRY.mapToolToGdata = function(toolName, args) {
    var entry = null;
    for (var i = 0; i < this.length; i++) {
        if (this[i].mcpToolName === toolName) { entry = this[i]; break; }
    }
    if (!entry) return null;

    // HTML-conversion tools (render_wireframelite, render_prototypelite) are processed server-side into
    // a stored action and drawn by a custom client action-transform, not this generic mapping. Return
    // null to signal that.
    if (entry.clientIsHtmlConversion) return null;

    // Media components (render_image / video / audio / 3dmodel): the asset itself is
    // generated by a MockFlow generator run from the connected editor, so there is no
    // gdata to build here. Null tells a consumer that cannot do that (the hosted and
    // desktop MCP servers) to refuse the call rather than draw an empty component.
    if (entry.clientServerGenerate) return null;

    var gdata = { aitype: entry.clientAitype, data: {} };
    if (entry.clientComp) gdata.comp = entry.clientComp;

    // Prompt: dynamic from args field or static string
    if (entry.clientPromptField) {
        gdata.data.prompt = (args && args[entry.clientPromptField]) || entry.clientPrompt;
    } else {
        gdata.data.prompt = entry.clientPrompt;
    }

    if (entry.clientTransform) {
        var result = entry.clientTransform(args);
        if (typeof result === 'string') {
            gdata.data[entry.clientDataField] = result;
        } else {
            if (result.comp) gdata.comp = result.comp;
            if (result.charts) gdata.charts = true;
            gdata.data[entry.clientDataField] = result.dataValue !== undefined ? result.dataValue : result.data;
            if (result.extraFields) {
                for (var k in result.extraFields) gdata[k] = result.extraFields[k];
            }
            if (result.extraDataFields) {
                for (var k in result.extraDataFields) gdata.data[k] = result.extraDataFields[k];
            }
        }
    } else {
        gdata.data[entry.clientDataField] = JSON.stringify(args);
    }

    return gdata;
};

// Helper: build recipeOutputKey → mcpToolName map for Agent Skills export
IDEABOARD_MCP_REGISTRY.buildRecipeToToolMap = function() {
    var map = {};
    for (var i = 0; i < this.length; i++) {
        var entry = this[i];
        if (entry.recipeOutputKeys) {
            for (var j = 0; j < entry.recipeOutputKeys.length; j++) {
                map[entry.recipeOutputKeys[j]] = entry.mcpToolName;
            }
        }
    }
    return map;
};

/**
 * Sanitize GoJS flowchart data: round coordinates, fix dimensions, remove orphan links.
 */
IDEABOARD_MCP_REGISTRY.sanitizeFlowData = function(args) {
    try {
        if (!args || !Array.isArray(args.nodeDataArray) || !Array.isArray(args.linkDataArray)) return args;

        var nodeKeys = {};
        for (var i = 0; i < args.nodeDataArray.length; i++) {
            var node = args.nodeDataArray[i];
            if (node.key != null) nodeKeys[node.key] = true;

            if (node.loc && typeof node.loc === 'string') {
                var parts = node.loc.split(' ');
                var x = Math.round(parseFloat(parts[0])) || 0;
                var y = Math.round(parseFloat(parts[1])) || 0;
                node.loc = x + ' ' + y;
            }

            if (node.width) node.width = Math.round(parseFloat(node.width)) || 140;
            if (node.height) node.height = Math.round(parseFloat(node.height)) || 60;
        }

        args.linkDataArray = args.linkDataArray.filter(function(link) {
            return link && nodeKeys[link.from] && nodeKeys[link.to];
        });
    } catch (e) {
        // Sanitization failed — return original data unchanged
    }
    return args;
};

module.exports = IDEABOARD_MCP_REGISTRY;
