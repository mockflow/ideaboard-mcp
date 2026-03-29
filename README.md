# MockFlow IdeaBoard MCP Server

[![npm version](https://img.shields.io/npm/v/@mockflow/ideaboard-mcp.svg)](https://www.npmjs.com/package/@mockflow/ideaboard-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Local [MCP](https://modelcontextprotocol.io/) server for [MockFlow IdeaBoard](https://mockflow.com). Create flowcharts, mind maps, kanban boards, cloud architecture diagrams, and 12+ other visualization types — directly from AI-powered coding tools.

Works with **Claude Code**, **Cursor**, **VS Code Copilot**, **Codex**, and any MCP-compatible client.

> **Note:** MCP servers may not provide the full experience for certain types of generation involving images, AI art, or complex designs. For the best seamless experience, use the [Mida AI agent](https://mockflow.com) inside the MockFlow editor.

## Quick Start

### 1. Install

```bash
npm install -g @mockflow/ideaboard-mcp
```

Or run without installing:

```bash
npx @mockflow/ideaboard-mcp
```

### 2. Authenticate

```bash
mockflow-mcp login
```

This opens your browser to MockFlow's login page. Log in with your MockFlow account and authorize access. The token is saved automatically to `~/.mockflow/credentials.json` (one-time setup).

### 3. Start the Server

```bash
mockflow-mcp
```

You'll see:

```
MockFlow IdeaBoard - Local MCP Server
======================================
User: you@example.com

MCP server running on http://localhost:21193/mcp

Add to your AI client:

  Claude Code:
    claude mcp add --transport http -s user mockflow-ideaboard http://localhost:21193/mcp
```

### 4. Connect Your AI Client

#### Claude Code

```bash
claude mcp add --transport http -s user mockflow-ideaboard http://localhost:21193/mcp
```

#### Cursor

Settings > Cursor Settings > Tools & MCP:

```json
{
  "mcpServers": {
    "mockflow-ideaboard": {
      "url": "http://localhost:21193/mcp"
    }
  }
}
```

#### VS Code Copilot

Create `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "mockflow-ideaboard": {
      "type": "http",
      "url": "http://localhost:21193/mcp"
    }
  }
}
```

#### Codex (OpenAI)

```bash
codex mcp add mockflow-ideaboard http://localhost:21193/mcp
```

### 5. Start Prompting

Ask your AI client:

```
"Create a flowchart showing the user registration process"
"Create a kanban board for the product launch"
"Draw an AWS architecture diagram with API Gateway, Lambda, and DynamoDB"
"Create a mind map about project management methodologies"
"Map out the database schema as an ER diagram"
```

The server creates a new IdeaBoard and returns the URL. Open it in your browser to view and edit.

## Available Tools (16)

| Tool | Description |
|------|-------------|
| `render_flowchart` | Flowcharts, UML, circuit, bio, P&ID, sketchy, 3D, web/mobile layout (11 categories) |
| `render_mindmap` | Hierarchical mind maps with balanced left/right branches |
| `render_cloudarchitecture` | AWS, Azure, GCP, Cisco network diagrams with VPC/subnet grouping |
| `render_chart` | Pie, bar, line, area, scatter, bubble, radar charts from CSV data |
| `render_table` | Data tables from CSV format |
| `render_spreadsheet` | Spreadsheets with formulas (SUM, AVERAGE, IF, etc.) and formatting |
| `render_kanban` | Kanban boards with columns, cards, priorities, and due dates |
| `render_gantt` | Gantt timeline charts with phases, tasks, and progress tracking |
| `render_calendar` | Calendars with timed and all-day events |
| `render_whiteboard` | Freeform whiteboards with sticky notes and sections |
| `render_customerjourney` | Customer journey maps with stages, activities, and satisfaction metrics |
| `render_storyboard` | Film/video storyboards with cinematic frame descriptions |
| `render_database` | Entity-relationship (ER) diagrams with tables, columns, and foreign keys |
| `render_swimlane` | Cross-functional swimlane diagrams with actor lanes |
| `render_map` | Geographic maps with location markers and coordinates |
| `render_markdown` | Rich documents with markdown formatting and AI-generated images |

## How It Works

```
You: "Create a kanban board for the sprint"
  |
  v
AI Client (Claude Code / Cursor / VS Code)
  |  generates structured data (columns, cards, etc.)
  v
MCP Server (localhost:21193)
  |  proxies to MockFlow backend
  v
app.mockflow.com
  |  creates IdeaBoard with visualization
  v
Returns board URL → open in browser to view/edit
```

1. Your AI client reads your codebase or follows your prompt
2. It calls the appropriate `render_*` tool via MCP with structured data
3. The local MCP server forwards the request to `app.mockflow.com`
4. MockFlow creates the board and returns a URL
5. You open the URL to view, edit, and share the visualization

## CLI Reference

```bash
mockflow-mcp                     # Start server on default port (21193)
mockflow-mcp --port=8888         # Start on custom port
mockflow-mcp login               # Set up API key (one-time)
mockflow-mcp --help              # Show usage and setup instructions
```

## Configuration

### Credentials

Stored in `~/.mockflow/credentials.json` (created automatically by `mockflow-mcp login`):

```json
{
  "access_token": "...",
  "userid": "you@example.com",
  "clientid": "your-client-id"
}
```

### Custom Port

If port 21193 is in use:

```bash
mockflow-mcp --port=8888
```

Then update your AI client config to use the new port.

### Debug Mode

For verbose logging:

```bash
MCP_DEBUG=1 mockflow-mcp
```

## Verify Installation

```bash
# Check server is running
curl http://localhost:21193/mcp

# List available tools
curl -X POST http://localhost:21193/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Troubleshooting

### "No credentials found"

Run `mockflow-mcp login` to authenticate with your MockFlow account.

### Port already in use

Another process is using port 21193. Either:
- Use a different port: `mockflow-mcp --port=8888`
- Kill the process: `lsof -ti :21193 | xargs kill`

### AI client doesn't use IdeaBoard tools

Be explicit in your prompt: *"Using mockflow-ideaboard, create a flowchart for..."*. AI clients have many tools and may default to generating code.

### Tool call fails with backend error

Ensure you have a valid login and internet connection. The server needs to reach `app.mockflow.com`. If your token expired, run `mockflow-mcp login` again.

## Example Prompts

### Codebase Visualization
```
"Analyze this codebase and create a system architecture diagram"
"Create a flowchart showing the authentication flow in this project"
"Map out the database schema as an ER diagram"
"Visualize the API endpoints as a swimlane diagram"
```

### Project Management
```
"Create a kanban board for the remaining TODOs in this project"
"Create a gantt chart for the Q2 product roadmap"
"Create a calendar with the team's sprint events for April"
```

### Brainstorming
```
"Create a mind map about microservices architecture patterns"
"Create a whiteboard with sticky notes for the retrospective"
"Create a customer journey map for the onboarding experience"
```

## Links

- **npm:** [npmjs.com/package/@mockflow/ideaboard-mcp](https://www.npmjs.com/package/@mockflow/ideaboard-mcp)
- **GitHub:** [github.com/mockflow/ideaboard-mcp](https://github.com/mockflow/ideaboard-mcp)
- **MockFlow:** [mockflow.com](https://mockflow.com)
- **WireframePro MCP:** [@mockflow/wireframepro-mcp](https://www.npmjs.com/package/@mockflow/wireframepro-mcp) — convert HTML to wireframes

## Contributing

Issues and pull requests are welcome at [github.com/mockflow/ideaboard-mcp](https://github.com/mockflow/ideaboard-mcp).

## License

[MIT](LICENSE)
