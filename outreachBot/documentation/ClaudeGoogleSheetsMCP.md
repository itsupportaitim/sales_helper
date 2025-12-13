Connecting Google Sheets MCP to Claude Code
Step 1: Install the MCP Server
Run one of these commands in your terminal:
# Using npx (recommended for local use)
claude mcp add google-sheets -- npx -y @anthropic-ai/mcp-server-google-sheets

# On Windows, wrap with cmd /c
claude mcp add google-sheets -- cmd /c npx -y @anthropic-ai/mcp-server-google-sheets
Step 2: Set Up Google API Credentials
Go to Google Cloud Console
Create/select a project
Enable Google Sheets API and Google Drive API
Create OAuth 2.0 credentials or a service account
Download your credentials
Step 3: Configure Authentication
You may need to pass your credentials as environment variables:
claude mcp add google-sheets --env GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json -- npx -y @anthropic-ai/mcp-server-google-sheets
Step 4: Verify Installation
# List installed servers
claude mcp list

# Check status in Claude Code
/mcp
Scope Options
Flag	Scope	Use Case
--scope local	Current project, private	Default
--scope project	Shared via .mcp.json	Team collaboration
--scope user	All your projects	Personal tools
Troubleshooting
Windows: Always use cmd /c wrapper for stdio servers
Auth issues: Use /mcp command to re-authenticate
Token limits: Set MAX_MCP_OUTPUT_TOKENS=50000 if needed
Once connected, you can ask me to read, write, and analyze your Google Sheets directly!





claude mcp add google-sheets -- npx @anthropic-ai/mcp-server-google-sheets

claude mcp add google-sheets --env GOOGLE_APPLICATION_CREDENTIALS="C:\Users\Admin User 9\projects\SALES\outreachBot\gcp-oauth.keys.json" -- cmd /c npx @anthropic-ai/mcp-server-google-sheets

"C:\Users\Admin User 9\projects\SALES\outreachBot\credentials.json"


----------
Authentication Successful!
Your authentication tokens have been saved successfully to:

C:\Users\Admin User 9\.config\google-drive-mcp\tokens.json

You can now close this browser window.