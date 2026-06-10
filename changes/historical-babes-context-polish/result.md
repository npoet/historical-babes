---
id: historical-babes-context-polish
title: Historical Babes Context Polish
status: completed
type: feature
changelog: public
---

## Summary

Polished the `/all` archive card layout, added compact historical-context layer badges, expanded selected profiles with sourced context events, and added a content QA guardrail for layered context metadata.

## Validation

- `npm run qa:content && npm run build` passed from `eminent-ellipse/`.
- `qa:content` passed while reporting existing weak-source and reference-type warnings already present in the public figure data.
- The static Astro build generated `/all`, `/timeline`, `/map`, and representative profile pages successfully.

## Shipped Changes

- Updated `src/pages/all.astro` and `src/styles/grid.css` so archive cards use a consistent vertical flex layout with bottom-aligned action rows and compact context badges.
- Added or reviewed context-event metadata for Adelina Otero-Warren, Hansa Mehta, Henrietta Leavitt, Mária Telkes, María Orosa, Marie Curie, Min Matheson, Sophie Scholl, and Zitkala-Ša.
- Added `scripts/qa-content.mjs` checks requiring layered context events to include `status` and `source`, and requiring `world` context events to include either a `thread` or explanatory `note`.
