import type { CollectionEntry } from "astro:content";

export type FigureEntry = CollectionEntry<"figures">;
export type FactStatus = "reviewed" | "approximate" | "needs-source";

export type RelatedFigure = {
  figure: FigureEntry;
  reasons: string[];
};

export const reliabilityCopy =
  "Archive beta: biographies are source-linked; map, timeline, context, date, and coordinate metadata may be approximate or under review.";

export const statusLabels: Record<FactStatus, string> = {
  reviewed: "Reviewed",
  approximate: "Approx.",
  "needs-source": "Needs source",
};

export const getStatusLabel = (status?: FactStatus) =>
  status ? statusLabels[status] : "Under review";

export const formatYear = (year?: number) => {
  if (typeof year !== "number") return "Unknown";
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year}`;
};

export const getOccupations = (figure: FigureEntry) =>
  figure.data.occupations?.length
    ? figure.data.occupations
    : figure.data.occupation
      ? figure.data.occupation.split(",").map((item) => item.trim())
      : [];

export const getSearchText = (figure: FigureEntry) =>
  [
    figure.data.name,
    figure.data.summary,
    figure.data.lifespan,
    figure.data.nationality,
    figure.data.occupation,
    figure.data.era,
    figure.data.sourceCredit,
    ...(figure.data.occupations ?? []),
    ...(figure.data.tags ?? []),
    ...(figure.data.themes ?? []),
    ...(
      figure.data.places?.flatMap((place) => [
        place.name,
        place.type,
        place.note,
      ]) ?? []
    ),
    ...(
      figure.data.contextEvents?.flatMap((event) => [
        event.label,
        event.place,
        event.note,
      ]) ?? []
    ),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export const getSearchBuckets = (figure: FigureEntry) => {
  const buckets = [
    {
      label: "Name",
      values: [figure.data.name],
    },
    {
      label: "Summary",
      values: [figure.data.summary],
    },
    {
      label: "Occupations",
      values: [figure.data.occupation, ...getOccupations(figure)],
    },
    {
      label: "Era",
      values: [figure.data.era],
    },
    {
      label: "Tags",
      values: figure.data.tags ?? [],
    },
    {
      label: "Themes",
      values: figure.data.themes ?? [],
    },
    {
      label: "Places",
      values:
        figure.data.places?.flatMap((place) => [
          place.name,
          place.type,
          place.note,
        ]) ?? [],
    },
    {
      label: "Context",
      values:
        figure.data.contextEvents?.flatMap((event) => [
          event.label,
          event.place,
          event.note,
        ]) ?? [],
    },
  ];

  return buckets
    .map((bucket) => ({
      label: bucket.label,
      text: bucket.values.filter(Boolean).join(" ").toLowerCase(),
    }))
    .filter((bucket) => bucket.text);
};

export const getSearchBucketData = (figure: FigureEntry) =>
  JSON.stringify(getSearchBuckets(figure));

export const getStartYear = (figure: FigureEntry) => {
  if (typeof figure.data.birthYear === "number") {
    return figure.data.birthYear;
  }

  const match = figure.data.lifespan?.match(/-?\d+/);

  return match ? Number(match[0]) : undefined;
};

export const getEndYear = (figure: FigureEntry) => {
  if (typeof figure.data.deathYear === "number") {
    return figure.data.deathYear;
  }

  const matches = figure.data.lifespan?.match(/-?\d+/g);

  return matches && matches.length > 1 ? Number(matches[1]) : undefined;
};

export const getRelatedFigures = (
  figure: FigureEntry,
  figures: FigureEntry[],
  limit = 3,
) => {
  const currentThemes = new Set(figure.data.themes ?? []);
  const currentOccupations = new Set(getOccupations(figure));
  const currentEra = figure.data.era;
  const currentPlaces = new Set(
    figure.data.places?.map((place) => place.name) ?? [],
  );

  const related = figures
    .filter((candidate) => candidate.id !== figure.id)
    .map((candidate) => {
      const candidateThemes = candidate.data.themes ?? [];
      const candidateOccupations = getOccupations(candidate);
      const candidatePlaces = candidate.data.places?.map((place) => place.name) ?? [];
      const reasons = new Set<string>();

      if (candidateThemes.some((theme) => currentThemes.has(theme))) {
        reasons.add("Shared theme");
      }

      if (currentEra && candidate.data.era === currentEra) {
        reasons.add("Same era");
      }

      if (candidateOccupations.some((occupation) => currentOccupations.has(occupation))) {
        reasons.add("Similar work");
      }

      if (candidatePlaces.some((place) => currentPlaces.has(place))) {
        reasons.add("Connected place");
      }

      return { figure: candidate, reasons: [...reasons] };
    })
    .filter(({ reasons }) => reasons.length > 0)
    .sort((a, b) => b.reasons.length - a.reasons.length)
    .slice(0, limit);

  return related satisfies RelatedFigure[];
};
