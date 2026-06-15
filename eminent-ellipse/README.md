# Eminent Ellipse

Astro app for Historical Babes.

## Local People Editor

Start the localhost-only editor:

```sh
npm run people:editor
```

Open the printed `http://127.0.0.1:4322` URL. The editor reads published profiles from `src/content/figures/` and drafts from `src/content/drafts/figures/`. Saving writes only to `src/content/drafts/figures/`; it does not expose an admin route in the production Astro build.

## CLI

```sh
npm run people -- list
npm run people -- create --name "New Person" --summary "Draft summary"
npm run people -- edit ada-lovelace --slug ada-lovelace-revision
npm run people -- promote ada-lovelace-revision
npm run people -- demote ada-lovelace --slug ada-lovelace-fix
npm run people -- delete draft temporary-test --yes
npm run people -- enrich --input proposal.json
npm run people -- validate --input draft.json
```

Drafts are review-first. Generated or proposed references, source notes, date/place confidence, related connections, context events, world-context links, and open questions should remain `needs-source` or `needs-review` until manually accepted.

## Imports

```sh
npm run import:drafts -- --input path/to/source
```

Imports support Instagram JSON exports, text/Markdown notes, and screenshot/image placeholders. They preserve original-source attribution and include review checklist text so the local editor can improve them before promotion.

## Promotion

Before promoting a draft to `src/content/figures/`, verify the content against reliable public sources, replace placeholders, and keep frontmatter compatible with `src/content.config.ts`.

```sh
npm run people -- promote draft-slug
```

Promotion removes the draft flag and writes `reviewed: true`. It refuses drafts that still contain `needs-source`, `needs-review`, or `reviewed: false` unless you pass `--force`.

To temporarily depublish something while you fix it:

```sh
npm run people -- demote published-slug --slug draft-slug
```

This moves the published profile back into `src/content/drafts/figures/` and removes it from the public collection. Add `--keep-published` if you only want a draft copy.

To clean up test or mistaken files:

```sh
npm run people -- delete draft draft-slug --yes
npm run people -- delete published published-slug --yes
```

Run:

```sh
npm run qa:content
npm run build
```

Do not commit `.spark/`, `changes/`, private change-request files, workflow files, or private notes.
