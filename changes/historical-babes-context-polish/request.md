# Historical Babes Context Polish

## Goal

Polish the archive browsing experience and add a small curated historical-context pass that makes the new event-layer model feel useful without turning this into a broad research rewrite.

## Required Outcomes

- Keep the site static-first on Astro and compatible with the existing GitHub Pages deployment.
- Keep public wording focused on "Historical context", "Context paths", or "Threads"; do not use "seed" in public-facing copy for this pass.
- Standardize archive cards on `/all` so the image, name/meta, summary, match hint, and action row align cleanly.
- Make `Open profile` and `Share` clearly bottom-aligned and consistent across archive cards.
- Fix the duplicated CSS typo in `grid.css` if the archive-card styles are touched.
- Add a small, sourced set of world/context entries that clarify how historical conditions shaped the featured women and their work.
- Avoid broad world-history timelines disconnected from the people in the archive.

## Historical Context Content Pass

- Add roughly 8-12 sourced context events total.
- Prefer profiles where a context event clearly explains life choices, constraints, opportunity, public stakes, or influence.
- Use the existing `contextEvents` model:
  - `layer`
  - `thread`
  - `importance`
  - year/start/end date
  - place where useful
  - note
  - status
  - source
- Use direct public source URLs for any new context entries.
- Do not add unsourced facts.
- Do not add new claims that are not supported by the cited source.
- Use `needs-source` only when preserving existing imperfect metadata; newly added context entries should have direct source URLs.

## Candidate Context Areas

- Suffrage, citizenship, and public power for Adelina Otero-Warren, Zitkala-Sa, Pamela Colman Smith, and Hansa Mehta.
- War, resistance, occupation, and public danger for Sophie Scholl, Maria Orosa, Vera Menchik, and Mata Hari.
- Science, institutions, credit, and recognition for Ada Lovelace, Marie Curie, Henrietta Leavitt, Mária Telkes, and Yvonne Barr.
- Civil rights, labor, publishing, and public life for Rosa Parks, Maria Stewart, Min Matheson, and Lena Richard.

## Archive And Search UX

- Keep archive cards compact and scannable.
- Preserve existing deep search behavior.
- Surface compact context/layer badges on archive cards only if they improve scanning and do not clutter the grid.
- Ensure search continues to index context/thread metadata.
- Keep related cards and search results explainable, not noisy.

## Content QA

- Add a small QA rule for context-event metadata.
- If a context event has `layer`, it should also have `status` and `source`.
- If a context event has `layer: world`, it should also have either `thread` or a note that explains why the context matters to the profile.
- Keep warnings useful and public-data-focused; do not add Spark runtime or private-workflow concepts to QA output.

## Acceptance Criteria

- `npm run qa:content` passes or reports only intentional existing warnings.
- `npm run build` passes.
- `/all` cards have consistent action alignment on desktop and mobile widths.
- Archive card sharing still works.
- `/timeline` and `/map` show added context with correct layers.
- Representative profiles show added context grouped under the existing layer sections.
- No private Spark runtime data, private notes, Instagram exports, screenshots, `dist/`, `.astro/`, or `node_modules/` are committed.
