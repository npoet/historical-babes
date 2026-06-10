# historical-babes
Historical Babes celebrates the women who have shaped our world. From renowned pioneers to forgotten trailblazers, we explore the lives, achievements, and legacies of women whose contributions have left a lasting mark on society, the sciences, the arts, and beyond.

![Those are historical babes](/eminent-ellipse/public/images/historical-babes.gif)

## Local People Workflow

People profiles live in `eminent-ellipse/src/content/figures/`. Local drafts live in `eminent-ellipse/src/content/drafts/figures/` and are ignored by Git except for `.gitkeep`.

Run the local browser editor:

```sh
npm run people:editor
```

The editor binds to `127.0.0.1` and is not an Astro page or production route. It can load published profiles and draft profiles. Saving always writes to `src/content/drafts/figures/`, so edits to published people start as draft copies.

Use the CLI from the repository root:

```sh
npm run people -- list
npm run people -- create --name "New Person" --summary "Short verified or draft summary"
npm run people -- edit ada-lovelace --slug ada-lovelace-revision
npm run people -- promote ada-lovelace-revision
npm run people -- demote ada-lovelace --slug ada-lovelace-fix
npm run people -- delete draft temporary-test --yes
npm run people -- enrich --input path/to/proposal.json
npm run people -- validate --input path/to/draft.json
```

Imported Instagram, text, Markdown, and screenshot/image notes can be converted into compatible drafts:

```sh
npm --prefix eminent-ellipse run import:drafts -- --input path/to/source
```

Enrichment is review-first. Proposed references, source notes, missing date/place confidence, related connections, context events, world-context links, and open questions must stay marked as `needs-source` or `needs-review` until a contributor manually accepts them. Prefer reliable public sources such as museums, archives, libraries, universities, primary-source collections, books/articles, authority records, and reputable reference sources.

To promote a draft, review the MDX, replace placeholders, and verify source-backed facts:

```sh
npm run people -- promote draft-slug
```

Promotion removes the draft flag and writes `reviewed: true`. It refuses drafts that still contain `needs-source`, `needs-review`, or `reviewed: false` unless you pass `--force`.

To temporarily depublish something while you fix it:

```sh
npm run people -- demote published-slug --slug draft-slug
```

This moves the published profile back into drafts and removes it from the public collection. Add `--keep-published` if you only want a draft copy.

Run:

```sh
npm run qa:content
npm run build
```

Never commit `.spark/`, `changes/`, private change-request files, workflow files, or private notes. Confirm with:

```sh
git ls-files changes .spark
```
