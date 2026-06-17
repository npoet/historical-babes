# People editor modules

The local people editor is intentionally served without a frontend build step. Keep behavior changes small and preserve the existing localhost-only workflow.

- `config.mjs`: host, port, image paths, source defaults, and content types.
- `server.mjs`: HTTP server, route handlers, and file-serving behavior.
- `page.mjs`: full HTML document assembly.
- `styles.mjs`: editor CSS.
- `client-script.mjs`: compatibility assembler for the inline browser script.
- `client/api-status.mjs`: API helper, status messaging, default values, theme, and image preview state.
- `client/form-state.mjs`: slug/lifespan sync, taxonomy suggestions, frontmatter generation, parsing, and form hydration.
- `client/token-repeaters.mjs`: token controls plus place, event, work, story seed, reference, and related-person repeaters.
- `client/source-search.mjs`: targeted source-search queue building, popup handling, and review-first enrichment proposal requests.
- `client/profile-list.mjs`: profile list filtering, datalist suggestions, loading, and review readiness display.
- `client/draft-actions.mjs`: toolbar/event wiring for save, copy, promote, demote, delete, upload, and initialization actions.
- `healthcheck.mjs`: script extraction and syntax checks used by content QA.
- `http.mjs`: small JSON/HTML response helpers.

Use `../people-content.mjs` for draft/profile file operations rather than duplicating content parsing or writing logic here.
