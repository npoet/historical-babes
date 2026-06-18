# People content modules

`../people-content.mjs` is the stable public entrypoint for CLI, importer, and editor code. Keep external imports pointed there unless a new script genuinely needs one focused lower-level helper.

- `paths.mjs`: repository-relative content paths, default image path, and shared allowed values.
- `utils.mjs`: scalar helpers such as slugging, list normalization, YAML scalar formatting, and empty-value cleanup.
- `frontmatter.mjs`: MDX frontmatter extraction and the small YAML subset parser used by local tooling.
- `normalize.mjs`: review-first normalization for references, related connections, context events, and open questions.
- `serialization.mjs`: draft MDX/frontmatter serialization helpers and default draft body/checklist creation.
- `profiles.mjs`: profile list/read/write operations, draft creation, copy, save, promote, demote, delete, cleanup, and draft input validation.
- `enrichment.mjs`: review-first enrichment proposals, source-gap prompts, confidence notes, likely related people, world-context links, and open questions.
