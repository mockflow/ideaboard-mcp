/**
 * IdeaBoard MCP Component Registry
 * Single source of truth for all IdeaBoard MCP tool definitions and client-side rendering mappings.
 *
 * To add a new component:
 *   1. Add an entry to this array
 *   2. Copy this file to: MockFlow-Desktop2/ideaboard-mcp/, ideaboard-mcp-local/
 *   3. Done — all MCP servers auto-derive tool definitions and client mapping
 */

var IDEABOARD_MCP_REGISTRY = [
    {
        mcpToolName: 'render_flowchart',
        mcpDescription: `Create diagrams including: Flowcharts, Sketchy Diagrams, 3D Isometric Diagrams, Bio/Medical Diagrams, Circuit Diagrams, P&ID Diagrams, UML Diagrams, Sketchy UML, Cloud Isometric Diagrams, Web Layout Diagrams, and Mobile Layout Diagrams.

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
        clientDataField: 'generatedflow',
        clientPrompt: 'default',
        clientPromptField: 'category',  // dynamic: uses args.category || clientPrompt
        clientTransform: null  // null = JSON.stringify(args)
    },
    {
        mcpToolName: 'render_mindmap',
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: 'MF_MindMap_ID',
        clientDataField: 'generatedmindmap',
        clientPrompt: 'mindmap',
        clientPromptField: null,
        clientTransform: null
    },
    {
        mcpToolName: 'render_cloudarchitecture',
        mcpDescription: `Create cloud architecture diagrams for AWS, Azure, GCP, or network infrastructure.

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
        clientDataField: 'generatedcloudarchitecture',
        clientPrompt: 'aws',
        clientPromptField: 'diagramType',  // dynamic: uses args.diagramType || clientPrompt
        clientTransform: null
    },
    {
        mcpToolName: 'render_chart',
        mcpDescription: `Create charts including pie, bar, line, area, scatter, bubble, and radar charts.

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
        clientDataField: 'generatedcharts',
        clientPrompt: 'chart',
        clientPromptField: null,
        clientTransform: function(args) {
            var chartdata = {
                data: args.chartData || '',
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
        }
    },
    {
        mcpToolName: 'render_table',
        mcpDescription: `Create data tables and grids from CSV-formatted data.

FORMAT RULES:
- First row = headers (column names)
- Data rows follow, separated by \\n
- Values separated by commas
- Wrap values containing commas in double quotes
- 5-15 data rows typical

EXAMPLE:
"Name,Email,Phone\\nJohn Doe,john@example.com,555-1234\\nJane Smith,jane@example.com,555-5678"

IMPORTANT: Always display the returned URL to the user.`,
        mcpInputSchema: {
            type: 'object',
            properties: {
                data: {
                    type: 'string',
                    description: 'CSV-formatted data. First row is headers, subsequent rows are data. Example: "Name,Email,Phone\\nJohn,john@email.com,555-1234"'
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
            return args.data || '';
        }
    },
    {
        mcpToolName: 'render_markdown',
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
        clientComp: 'MF_Document_ID',
        clientDataField: 'generatedDoc',
        clientPrompt: 'doc',
        clientPromptField: null,
        clientTransform: function(args) {
            return {
                dataValue: args.content || '',
                extraFields: { generatedDoc: args.content || '' }
            };
        }
    },
    {
        mcpToolName: 'render_map',
        mcpDescription: `Create maps with location markers for visualizing geographical data.

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
        mcpInputSchema: {
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: 'MF_Maps_ID',
        clientDataField: 'generatedmaps',
        clientPrompt: 'map',
        clientPromptField: null,
        clientTransform: null
    },
    {
        mcpToolName: 'render_spreadsheet',
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

EXAMPLE:
{
  "cellData": "{\\"A1\\":\\"Product\\",\\"B1\\":\\"Price\\",\\"C1\\":\\"Qty\\",\\"D1\\":\\"Total\\",\\"A2\\":\\"Widget A\\",\\"B2\\":\\"25\\",\\"C2\\":\\"10\\",\\"D2\\":\\"=B2*C2\\",\\"A3\\":\\"Total\\",\\"D3\\":\\"=SUM(D2:D2)\\"}",
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
            var spreadsheetData = {
                data: args.cellData ? JSON.parse(args.cellData) : {},
                formulas: args.formulas ? JSON.parse(args.formulas) : {},
                rows: args.rows || 10,
                cols: args.cols || 5,
                formatting: args.formatting ? JSON.parse(args.formatting) : {}
            };
            return JSON.stringify(spreadsheetData);
        }
    },
    {
        mcpToolName: 'render_whiteboard',
        mcpDescription: `Create whiteboards with sticky notes and sections for freeform brainstorming.

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
                                    tx: { type: 'string', description: 'Text content' },
                                    fc: { type: 'array', items: { type: 'string' }, description: 'Fill colors array' }
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
            return {
                dataValue: s,
                extraDataFields: { isCompressed: true, generatedui: s }
            };
        }
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
        clientTransform: null
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
        clientTransform: null
    },
    {
        mcpToolName: 'render_gantt',
        mcpDescription: `Create a Gantt chart with project phases and tasks on a timeline for project planning, scheduling, and milestone tracking.

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
        clientComp: 'MF_Gantt_ID',
        clientDataField: 'generatedtext',
        clientPrompt: 'gantt',
        clientPromptField: null,
        clientTransform: null
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
        clientTransform: null
    },
    {
        mcpToolName: 'render_storyboard',
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
        },

        // Client-side rendering (showResults gdata mapping)
        clientAitype: 'gencomp',
        clientComp: 'MF_StoryBoard_ID',
        clientDataField: 'generatedtext',
        clientPrompt: 'storyboard',
        clientPromptField: null,
        clientTransform: null
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
        clientDataField: 'generateddbdiagram',
        clientPrompt: 'database',
        clientPromptField: null,
        clientTransform: null
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
        clientDataField: 'generatedtext',
        clientPrompt: 'swimlane',
        clientPromptField: null,
        clientTransform: null
    }
];

// Helper: build tool definitions array for MCP servers
IDEABOARD_MCP_REGISTRY.getToolDefinitions = function() {
    return this.map(function(entry) {
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

module.exports = IDEABOARD_MCP_REGISTRY;
