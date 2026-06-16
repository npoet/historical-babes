# People editor modules

The local people editor is intentionally served without a frontend build step. Keep behavior changes small and preserve the existing localhost-only workflow.

- `config.mjs`: host, port, image paths, source defaults, and content types.
- `server.mjs`: HTTP server, route handlers, and file-serving behavior.
- `page.mjs`: full HTML document assembly.
- `styles.mjs`: editor CSS.
- `client-script.mjs`: inline browser script for form state, repeaters, enrichment, source searches, and API calls.
- `healthcheck.mjs`: script extraction and syntax checks used by content QA.
- `http.mjs`: small JSON/HTML response helpers.

Use `../people-content.mjs` for draft/profile file operations rather than duplicating content parsing or writing logic here.
