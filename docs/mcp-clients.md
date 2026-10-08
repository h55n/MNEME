# MNEME client setup and validation

Reviewed 2026-10-08. Client product names here describe compatibility, not project authorship.

## Best path

Use the authenticated Streamable HTTP endpoint on the existing API origin:
`https://trymneme-api.onrender.com/mcp?vault=YOUR_VAULT_UUID` with
`Authorization: Bearer YOUR_API_KEY`. This removes a second hosted service and
avoids asking desktop users to install Node for clients that support headers.
The endpoint requires redeployment of the API after this change.

For clients without custom-header support, use the local stdio adapter from the
README. `@mneme/mcp` is not published in the npm registry; do not use `npx` with
that name. Settings now generates JSON safely rather than interpolating secrets
into raw JSON. Treat that config as a secret.

## Client matrix

| Client | Setup | Current limit | Test status |
| --- | --- | --- | --- |
| Cursor | Customize or `.cursor/mcp.json`; URL + Authorization header | Per-user key/vault setup; one-click plugin packaging not published | Official HTTP client protocol tests pass; actual Cursor app not tested |
| Windsurf legacy Cascade | `~/.codeium/windsurf/mcp_config.json`; `serverUrl` or `url` + headers | MCP must be enabled by admin; newer Devin Local uses different CLI configs | Official HTTP client protocol tests pass; actual desktop app not tested |
| Claude Desktop local | Settings developer config; `node` with absolute built server path + env | Requires local build and restart | Server tools tested; actual Desktop app not tested |
| Claude remote connector | Settings > Connectors > add custom; endpoint URL | API-key request headers are a limited beta. Use `?vault=` instead of a custom vault header; outside beta use local adapter | Documented route only; actual connector not tested |
| ChatGPT custom MCP app | Settings/Workspace > Apps > Create; scan tools | Official docs list Business/Enterprise/Edu role requirements; authenticated MNEME needs supported header auth or future OAuth | No actual ChatGPT call proven; do not claim connected |

Desktop apps are not available in a web browser. A successful reference-client
protocol call is necessary evidence, but is not proof of a vendor application's
UI, permissions, tool selection, or end-to-end execution.

## Plugin-style paths

- Cursor Marketplace supports one-click plugins; a MNEME listing/package remains
  future distribution work, not an existing published plugin.
- Windsurf's registry supports one-click installs and registry deeplinks. MNEME
  has no verified registry listing; manual custom config works without one.
- Claude Desktop extensions (MCPB) can bundle the local server and prompt for
  configuration, removing manual JSON edits. A distributable signed/reviewed
  bundle has not been built in this pass.
- Claude remote connectors are the smoother cross-surface path where header
  auth is available. General per-user onboarding needs OAuth rather than a
  shared static credential.
- ChatGPT MCP apps are the current integration path, not legacy ChatGPT plugins.
  MNEME has no OAuth discovery, consent, token or refresh endpoints yet. Do not
  place bearer keys in URLs or create an unauthenticated proxy as a workaround.

## Verification checklist for each real client

1. Use a dedicated test vault and key, never a real person's memory contents.
2. Initialize and discover exactly seven tools.
3. Write a unique synthetic sentence with `memory_write`.
4. Recall it with `memory_recall`; compare the returned content and vault scope.
5. List/export to verify visibility. Forget only the synthetic test memory.
6. Try a missing key and a wrong-vault key. No cross-vault memory may be returned.
7. Record client version, transport, time, endpoint deployment revision, and tool
   outputs without credentials. Retest after key rotation.

## Sources

- Cursor transports and config: https://cursor.com/docs/mcp.md
- Windsurf/Cascade transports and registry: https://docs.windsurf.com/windsurf/cascade/mcp
- Claude remote connector auth and limited header beta: https://claude.com/docs/connectors/custom/remote-mcp
- Claude Desktop extension vs remote connector: https://support.claude.com/en/articles/11725091-when-to-use-desktop-and-web-connectors
- ChatGPT plan/role and custom app flow: https://help.openai.com/en/articles/12584461
