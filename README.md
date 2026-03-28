# MockFlow IdeaBoard MCP

Connect AI-powered IDE clients (Claude Code, Cursor, VS Code Copilot) to [MockFlow IdeaBoard](https://mockflow.com) to create flowcharts, architecture diagrams, mind maps, kanban boards, and 12+ other visualization types — all from natural language prompts.

## Two Ways to Use

### Option 1: MockFlow Desktop App (Recommended)

If you use the [MockFlow Desktop App](https://mockflow.com/apps/wireframepro/), it includes a **built-in local MCP server** that starts automatically when you launch the app.

**How it works:** Visualizations are rendered **directly in your open board** — no remote server calls, no image export. The AI creates components right on your canvas.

```
You in Claude Code: "Create an architecture diagram for this codebase"
    |
Claude Code reads your files, understands the code
    |
Calls render_cloudarchitecture via MCP (localhost:21193)
    |
MCP server passes data to the desktop app
    |
Diagram appears directly in your open IdeaBoard
```

**Setup:**

1. Open MockFlow Desktop App and log in
2. Open an IdeaBoard project (the board you want to add visualizations to)
3. Add the MCP to your AI client (see [Client Setup](#client-setup) below)
4. Start prompting!

### Option 2: Standalone CLI (No Desktop App)

For users who don't have the desktop app. Runs as a standalone process and creates boards via the MockFlow cloud backend.

**How it works:** Tool calls are proxied to `app.mockflow.com`, which creates a new board and returns a URL you can open in your browser.

```
You in Claude Code: "Create a flowchart for the login process"
    |
Claude Code calls render_flowchart via MCP (localhost:21193)
    |
CLI server proxies to app.mockflow.com
    |
New board created → URL returned
    |
You open the URL in your browser to view/edit
```

**Setup:**

```bash
# Install globally
npm install -g @mockflow/ideaboard-mcp

# One-time login
mockflow-mcp login
# Opens browser → get your API key from app.mockflow.com/mcp-apikey ��� paste it

# Start the server
mockflow-mcp
```

### Comparison

| | Desktop App | Standalone CLI |
|---|---|---|
| **Rendering** | Directly in your open board | Creates new board, returns URL |
| **Speed** | Instant (local) | Depends on network |
| **Auth** | Automatic (you're logged in) | API key (one-time setup) |
| **Requires** | Desktop app + board open | Just the CLI running |
| **Backend** | None needed | app.mockflow.com |
| **Best for** | Active design work | Quick visualizations |

## Client Setup

Both options run on `localhost:21193`. Use the same setup for either one.

### Claude Code

```bash
claude mcp add --transport http -s user mockflow-ideaboard http://localhost:21193/mcp
```

### Cursor

Settings > Cursor Settings > Tools & MCP, add:

```json
{
  "mcpServers": {
    "mockflow-ideaboard": {
      "url": "http://localhost:21193/mcp"
    }
  }
}
```

### VS Code Copilot

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

### Codex (OpenAI)

```bash
codex mcp add mockflow-ideaboard http://localhost:21193/mcp
```

## Available Visualizations (16 tools)

| Tool | Description |
|------|-------------|
| `render_flowchart` | Flowcharts, UML, circuit, bio, P&ID, sketchy, 3D, web/mobile layout |
| `render_mindmap` | Hierarchical mind maps |
| `render_cloudarchitecture` | AWS, Azure, GCP, Cisco network diagrams |
| `render_chart` | Pie, bar, line, area, scatter, bubble, radar charts |
| `render_table` | Data tables from CSV |
| `render_spreadsheet` | Spreadsheets with formulas and formatting |
| `render_kanban` | Kanban project management boards |
| `render_gantt` | Gantt timeline charts with tasks and phases |
| `render_calendar` | Calendar with events |
| `render_whiteboard` | Freeform sticky notes and sections |
| `render_customerjourney` | Customer journey maps with stages and metrics |
| `render_storyboard` | Film/video storyboards with scene frames |
| `render_database` | Entity-relationship (ER) diagrams |
| `render_swimlane` | Cross-functional swimlane diagrams |
| `render_map` | Geographic maps with location markers |
| `render_markdown` | Rich documents with AI-generated images |

## Example Prompts

Once connected, try these in Claude Code or Cursor:

- *"Analyze this codebase and create a system architecture diagram"*
- *"Create a flowchart showing the authentication flow in this project"*
- *"Map out the database schema as an ER diagram"*
- *"Create a kanban board for the remaining TODOs in this project"*
- *"Visualize the API endpoints as a swimlane diagram"*
- *"Create a mind map of the project's module structure"*
- *"Draw an AWS architecture diagram for this microservices setup"*

## CLI Options

```bash
mockflow-mcp                    # Start on default port (21193)
mockflow-mcp --port=8888        # Custom port
mockflow-mcp login              # Set up API key credentials
mockflow-mcp --help             # Show usage and client setup instructions
```

## Troubleshooting

**"No IdeaBoard is open in the desktop app"**
Open an IdeaBoard project in the desktop app before running prompts.

**Port 21193 already in use**
The desktop app or another instance is using the port. Use `mockflow-mcp --port=8888` for the CLI, or close the other instance.

**Claude Code doesn't use the MCP tools**
Be explicit: *"Using the mockflow-ideaboard tool, create a flowchart for..."* or *"Create a flowchart on IdeaBoard"*. Claude Code has many tools available and may default to generating code unless you mention IdeaBoard.

**Verify the server is running**
```bash
curl http://localhost:21193/mcp
```

## Debug Mode

```bash
MCP_DEBUG=1 mockflow-mcp
```
