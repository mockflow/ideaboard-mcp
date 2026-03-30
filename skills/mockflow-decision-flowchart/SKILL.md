---
name: mockflow-decision-flowchart
description: Creates a yes/no decision tree flowchart using MockFlow IdeaBoard MCP server. Use when the user needs to visualize decisions, choices, branching logic, or pick between options. Trigger keywords: flowchart, decision, choices, branching, pick, choose.
allowed-tools: mcp__ideaboard__render_flowchart
---

# Decision Flowchart

## Requirements
- MockFlow IdeaBoard MCP server (desktop on port 21193 or remote at app.mockflow.com)

## Author
MockFlow

## Category
diagrams

## Output Type
flowchart

## Instructions
Create a yes/no decision tree flowchart that helps someone make a choice. Each node should be a clear question with two branches (Yes/No or two options). Lead to 3-5 distinct outcomes at the leaves. Keep questions practical and opinionated. Maximum 4 levels deep.

## How to execute
Call the `render_flowchart` MCP tool from MockFlow IdeaBoard with the following structure:

```json
{
  "diagramType": "default",
  "nodeDataArray": [
    { "key": 0, "text": "Root Question?", "category": "Start" },
    { "key": 1, "text": "Follow-up Question?", "category": "Standard" },
    { "key": 2, "text": "Outcome A", "category": "End" }
  ],
  "linkDataArray": [
    { "from": 0, "to": 1, "text": "Yes" },
    { "from": 0, "to": 2, "text": "No" }
  ]
}
```

## Input examples
- "Should I buy or rent a house?"
- "Should I use a monorepo or multi-repo?"
- "How to choose a programming language for my project?"

## Output
A visual flowchart rendered on the MockFlow IdeaBoard canvas with decision nodes and labeled branches.
