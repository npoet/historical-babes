# Historical Babes Event Layer Foundation

## Goal

Make timeline, map, thread, and profile context easier to understand by separating personal life/place moments, individual impact moments, and broader world backdrop events through explicit content metadata and consistent UI language.

## Required Outcomes

- Keep the site static-first on Astro and compatible with the existing GitHub Pages deployment.
- Add explicit event layer metadata for context events:
  - `personal` for life/place milestones when represented as context.
  - `impact` for a figure's work, contribution, or personally driven historical moment.
  - `world` for broader movements, wars, laws, eras, and multi-person context.
- Add optional thread and importance metadata for future richer story paths.
- Replace duplicated or heuristic map/timeline layer labeling with shared helper labels.
- Preserve fallback classification for older context events that do not yet have explicit layer metadata.
- Classify existing context events without inventing new facts or adding broad new research claims.

## Timeline

- Keep layer toggles visible and consistent:
  - Life + places
  - Impact moments
  - World backdrop
- Add era focus controls near the timeline scale so visitors can narrow and jump to a historical period.
- Split the timeline key so impact and world events are visually distinct.
- Let curated thread cards link into a useful timeline state.
- Show layer, thread, source, profile link, and alive-at-this-time context in timeline details where available.

## Map

- Use the same explicit event layers as the timeline.
- Keep marker filtering for personal, impact, and world layers.
- Use consistent layer labels in the map legend, map browser, marker data, and selected marker detail.
- Keep profile and timeline links in map details.

## Profile Pages

- Rework the profile layout so long source lists do not create large white gaps in the main biography/context flow.
- Split profile context into:
  - Places
  - Life + places
  - Impact moments
  - World backdrop
- Add context links to timeline, map, and source URLs when the data supports them.
- Keep source cards compact, grouped by source type, and visibly status-labeled.

## Content Scope

- Update current profile data only enough to support the new structure.
- Classify the existing context events and add thread/importance metadata where obvious from current content.
- Do not add unsourced new claims.
- Defer broad source expansion and full profile enrichment to later, reviewable batches.

## Acceptance Criteria

- `npm run build` passes.
- `/timeline` renders era focus controls, distinct layer toggles, split impact/world labels, and usable thread links.
- `/map` renders markers and filters using explicit layer metadata.
- Representative profiles render without large source-column white gaps.
- Ada Lovelace, Marie Curie, Rosa Parks, and Joan of Arc show context grouped by layer.
- No private Spark runtime data, private notes, Instagram exports, screenshots, `dist/`, `.astro/`, or `node_modules/` are committed.
