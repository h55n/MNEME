# MNEME browser extension

Load this folder as an unpacked Manifest V3 extension in Chrome's developer
mode. Configure the API base URL (including `/v1`), API key and vault ID in the
popup. There is no default hosted endpoint: use an API you control.

Saving asks for access to that API's host. HTTPS is required except for local
HTTP development on localhost or 127.0.0.1. Keys are stored in device-local
extension storage, not browser sync. Saving removes legacy synced settings.
Local extension storage is not encrypted storage; use a scoped vault key and
do not install the extension on a shared browser profile.

On a supported site's textarea, click MNEME to recall context. This sends up to
1000 characters of the textarea to your configured API. It then appends the
returned context to the draft. It does not submit the message. Read the context
before sending it to the site's model: the site's operator will receive any
context you include in that message.

Current content support is textarea-based. Modern ChatGPT, Claude and Gemini
editors may use contenteditable fields; those are not supported yet. This is
not a verified working integration with every current version of those sites.

## Tests

Run `node --test apps/extension/test/*.cjs` from the repository root. These cover
the actual background script with mocked Chrome storage/permissions/fetch,
including host validation, malformed responses and generic page-facing errors.
A local Chrome smoke test also checks popup saving and textarea injection.
Real extension host-permission prompts and signed-in consumer sites still need
manual validation. No browser-store publication is part of these tests.
