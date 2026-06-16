import type { CollectionEntry } from "astro:content";
import {
  contextLayerLabels,
  formatYear,
  getContextLayer,
  getOccupations,
  getStartYear,
  getStatusLabel,
} from "./figures";

type FigureEntry = CollectionEntry<"figures">;

const workTitle = (work: string | { title: string }) =>
  typeof work === "string" ? work : work.title;

const workYear = (work: string | { year?: number; startYear?: number }) =>
  typeof work === "string" ? undefined : work.year ?? work.startYear;

const workEndYear = (
  work: string | { year?: number; startYear?: number; endYear?: number },
) => (typeof work === "string" ? undefined : work.endYear ?? work.year ?? work.startYear);

const workNote = (work: string | { note?: string }) =>
  typeof work === "string" ? "" : work.note ?? "";

const workStatus = (
  work: string | { status?: "reviewed" | "approximate" | "needs-source" },
) => (typeof work === "string" ? undefined : work.status);

const seedYear = (seed: { year?: number; startYear?: number }) =>
  seed.year ?? seed.startYear;

const seedEndYear = (seed: { year?: number; startYear?: number; endYear?: number }) =>
  seed.endYear ?? seed.year ?? seed.startYear;

export const buildTimelineModel = (figures: FigureEntry[]) => {
  const figureRows = figures.map((figure) => {
    const startYear = getStartYear(figure);
    const endYear = typeof figure.data.deathYear === "number" ? figure.data.deathYear : startYear;

    return {
      id: figure.id,
      name: figure.data.name,
      startYear,
      endYear,
      label: figure.data.lifespan ?? formatYear(startYear),
      era: figure.data.era ?? "Unknown era",
      themes: figure.data.themes ?? [],
      occupations: getOccupations(figure),
      status: getStatusLabel(figure.data.dateStatus),
      summary: figure.data.summary ?? "",
      type: "life",
      href: `/${figure.id}`,
      scope: "person",
      layer: "personal",
    };
  });

  const workRows = figures.flatMap(
    (figure) =>
      figure.data.importantWorks
        ?.filter((work) => typeof workYear(work) === "number")
        .map((work) => ({
          id: `${figure.id}-${workTitle(work)}`,
          figureId: figure.id,
          name: workTitle(work),
          figureName: figure.data.name,
          startYear: workYear(work),
          endYear: workEndYear(work),
          label:
            [workYear(work), workEndYear(work)]
              .filter((year, index, years) => typeof year === "number" && years.indexOf(year) === index)
              .map((year) => formatYear(year))
              .join("-") || "Unknown date",
          era: figure.data.era ?? "Unknown era",
          themes: figure.data.themes ?? [],
          occupations: getOccupations(figure),
          status: getStatusLabel(workStatus(work) ?? figure.data.sourceCoverageStatus),
          summary: workNote(work),
          type: "work",
          href: `/${figure.id}`,
          scope: "person",
          layer: "impact",
        })) ?? [],
  );

  const placeRows = figures.flatMap(
    (figure) =>
      figure.data.places
        ?.filter((place) => typeof place.startYear === "number" || typeof place.endYear === "number")
        .map((place) => ({
          id: `${figure.id}-${place.name}-${place.startYear ?? place.endYear}`,
          figureId: figure.id,
          name: place.name,
          figureName: figure.data.name,
          startYear: place.startYear ?? place.endYear,
          endYear: place.endYear ?? place.startYear,
          label:
            [place.startYear, place.endYear]
              .filter((year, index, years) => typeof year === "number" && years.indexOf(year) === index)
              .map((year) => formatYear(year))
              .join("-") || "Unknown date",
          era: figure.data.era ?? "Unknown era",
          themes: figure.data.themes ?? [],
          occupations: getOccupations(figure),
          status: getStatusLabel(place.status),
          summary: place.note ?? "",
          type: "place",
          href: `/${figure.id}`,
          scope: "person",
          layer: "personal",
        })) ?? [],
  );

  const eventRows = figures.flatMap(
    (figure) =>
      figure.data.contextEvents?.map((event) => {
        const layer = getContextLayer(event);

        return {
          id: `${figure.id}-${event.label}`,
          figureId: figure.id,
          name: event.label,
          figureName: figure.data.name,
          startYear: event.year ?? event.startYear,
          endYear: event.endYear ?? event.year ?? event.startYear,
          label:
            [event.year ?? event.startYear, event.endYear]
              .filter((year) => typeof year === "number")
              .map((year) => formatYear(year))
              .join("-") || "Unknown date",
          era: figure.data.era ?? "Unknown era",
          themes: figure.data.themes ?? [],
          occupations: getOccupations(figure),
          status: getStatusLabel(event.status),
          summary: event.note ?? "",
          type: "event",
          href: `/${figure.id}`,
          source: event.source ?? "",
          thread: event.thread ?? "",
          importance: event.importance ?? "supporting",
          scope: "context",
          layer,
          layerLabel: contextLayerLabels[layer],
        };
      }) ?? [],
  );

  const seedRows = figures.flatMap(
    (figure) =>
      figure.data.storySeeds
        ?.filter((seed) => typeof seedYear(seed) === "number")
        .map((seed) => ({
          id: `${figure.id}-story-${seed.title}`,
          figureId: figure.id,
          name: seed.title,
          figureName: figure.data.name,
          startYear: seedYear(seed),
          endYear: seedEndYear(seed),
          label:
            [seedYear(seed), seedEndYear(seed)]
              .filter((year, index, years) => typeof year === "number" && years.indexOf(year) === index)
              .map((year) => formatYear(year))
              .join("-") || "Unknown date",
          era: figure.data.era ?? "Unknown era",
          themes: figure.data.themes ?? [],
          occupations: getOccupations(figure),
          status: getStatusLabel(seed.status),
          summary: seed.prompt,
          note: seed.note ?? "",
          type: "story",
          href: `/${figure.id}`,
          source: seed.source ?? "",
          thread: seed.title,
          importance: "major",
          scope: "person",
          layer: "impact",
          layerLabel: contextLayerLabels.impact,
        })) ?? [],
  );

  const rows = [...figureRows, ...workRows, ...placeRows, ...eventRows, ...seedRows].sort((a, b) => {
    const aYear = typeof a.startYear === "number" ? a.startYear : Number.POSITIVE_INFINITY;
    const bYear = typeof b.startYear === "number" ? b.startYear : Number.POSITIVE_INFINITY;
    return aYear - bYear;
  });
  const datedRows = rows.filter((row) => typeof row.startYear === "number");
  const minYear = Math.min(...datedRows.map((row) => row.startYear ?? 0));
  const maxYear = Math.max(
    new Date().getFullYear(),
    ...datedRows.map((row) => row.endYear ?? row.startYear ?? 0),
  );
  const range = Math.max(1, maxYear - minYear);
  const eras = [...new Set(figureRows.map((row) => row.era))].sort();
  const themes = [...new Set(figureRows.flatMap((row) => row.themes))].sort();
  const eraRanges = eras
    .map((era) => {
      const eraRows = datedRows.filter((row) => row.era === era);
      return {
        era,
        startYear: Math.min(...eraRows.map((row) => row.startYear ?? 0)),
        endYear: Math.max(...eraRows.map((row) => row.endYear ?? row.startYear ?? 0)),
        count: eraRows.length,
      };
    })
    .filter((era) => Number.isFinite(era.startYear) && Number.isFinite(era.endYear))
    .sort((a, b) => a.startYear - b.startYear);
  const yearBuckets = new Map<number, number>();

  for (const row of datedRows) {
    const bucket = Math.floor((row.startYear ?? 0) / 50) * 50;
    yearBuckets.set(bucket, (yearBuckets.get(bucket) ?? 0) + 1);
  }

  const denseYear = [...yearBuckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? minYear;
  const importantYear = datedRows.find((row) => row.type === "event")?.startYear ?? denseYear;
  const positionFor = (year?: number) =>
    typeof year === "number" ? `${(((year - minYear) / range) * 100).toFixed(2)}%` : "0%";
  const timelineMidpoint = Math.round((minYear + maxYear) / 2);
  const laneFor = (type: string) =>
    ({
      life: 18,
      work: 38,
      place: 56,
      event: 72,
      story: 86,
    })[type] ?? 50;

  return {
    denseYear,
    eraRanges,
    eras,
    importantYear,
    laneFor,
    maxYear,
    minYear,
    positionFor,
    rows,
    seedRows,
    themes,
    timelineMidpoint,
  };
};
