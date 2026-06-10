import type { CollectionEntry } from "astro:content";

export type FigureEntry = CollectionEntry<"figures">;
export type FactStatus = "reviewed" | "approximate" | "needs-source";
export type SourceType =
  | "primary"
  | "archive"
  | "museum"
  | "book"
  | "article"
  | "reference"
  | "authority";
export type SourceStrength = "strong" | "partial" | "needs-review";
export type ContextLayer = "personal" | "impact" | "world";
export type ConnectionReason =
  | "shared theme"
  | "similar work"
  | "same era"
  | "connected place"
  | "shared context event"
  | "historical thread";

export type RelatedFigure = {
  figure: FigureEntry;
  reasons: ConnectionReason[];
  note?: string;
};

export const contextLayerLabels: Record<ContextLayer, string> = {
  personal: "Life + places",
  impact: "Impact moments",
  world: "World backdrop",
};

export const contextLayerShortLabels: Record<ContextLayer, string> = {
  personal: "Life",
  impact: "Impact",
  world: "World",
};

export const getContextLayer = (
  event?: { label?: string; layer?: ContextLayer },
): ContextLayer => {
  if (event?.layer) return event.layer;

  return /\b(boycott|falls|ratifies|siege|war|movement|revolution|period|amendment)\b/i.test(
    event?.label ?? "",
  )
    ? "world"
    : "impact";
};

export const reliabilityCopy =
  "Archive beta: biographies are source-linked; map, timeline, context, date, and coordinate metadata may be approximate or under review.";

export const statusLabels: Record<FactStatus, string> = {
  reviewed: "Reviewed",
  approximate: "Approximate",
  "needs-source": "Needs source",
};

export const getStatusLabel = (status?: FactStatus) =>
  status ? statusLabels[status] : "In beta review";

export const sourceTypeLabels: Record<SourceType, string> = {
  primary: "Primary sources",
  archive: "Archives",
  museum: "Museums",
  book: "Books",
  article: "Articles",
  reference: "References",
  authority: "Authority records",
};

export const sourceTypeFilterLabels: Record<SourceType, string> = {
  primary: "Primary sources",
  archive: "Museum/archive",
  museum: "Museum/archive",
  book: "Books",
  article: "Articles",
  reference: "References",
  authority: "Authority records",
};

export const sourceFilterOptions = [
  {
    label: "Primary sources",
    value: "primary",
  },
  {
    label: "Museum/archive",
    value: "museum|archive",
  },
  {
    label: "Books",
    value: "book",
  },
  {
    label: "Articles",
    value: "article",
  },
  {
    label: "References",
    value: "reference",
  },
  {
    label: "Authority records",
    value: "authority",
  },
];

export const sourceStrengthLabels: Record<SourceStrength, string> = {
  strong: "Strong",
  partial: "Partial",
  "needs-review": "Needs review",
};

export const sourceStrengthFromCoverage = (
  strength?: SourceStrength,
  status?: FactStatus,
) => {
  if (strength) return strength;
  if (status === "reviewed") return "strong";
  if (status === "approximate") return "partial";
  return "needs-review";
};

export const getSourceStrengthLabel = (
  strength?: SourceStrength,
  status?: FactStatus,
) => sourceStrengthLabels[sourceStrengthFromCoverage(strength, status)];

export const getFigureSourceStrength = (figure: FigureEntry): SourceStrength => {
  if (figure.data.sourceStrength) return figure.data.sourceStrength;

  const referenceCount = figure.data.references?.length ?? 0;
  if (referenceCount >= 2 && figure.data.sourceCoverageStatus === "reviewed") {
    return "strong";
  }
  if (referenceCount > 0) return "partial";
  return "needs-review";
};

export const getFigureSourceStrengthLabel = (figure: FigureEntry) =>
  sourceStrengthLabels[getFigureSourceStrength(figure)];

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
        event.layer,
        event.thread,
        event.importance,
        event.place,
        event.note,
      ]) ?? []
    ),
    ...(
      figure.data.storySeeds?.flatMap((seed) => [
        seed.title,
        seed.prompt,
        seed.note,
      ]) ?? []
    ),
    ...(
      figure.data.references?.flatMap((reference) => [
        reference.title,
        reference.type,
        reference.note,
        reference.authorityId,
        ...(reference.supports ?? []),
      ]) ?? []
    ),
    ...(
      figure.data.relatedConnections?.flatMap((connection) => [
        connection.id,
        connection.note,
        ...(connection.reasons ?? []),
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
          event.layer,
          event.thread,
          event.importance,
          event.place,
          event.note,
        ]) ?? [],
    },
    {
      label: "Historical threads",
      values:
        figure.data.storySeeds?.flatMap((seed) => [
          seed.title,
          seed.prompt,
          seed.note,
        ]) ?? [],
    },
    {
      label: "Sources",
      values:
        figure.data.references?.flatMap((reference) => [
          reference.title,
          reference.type,
          reference.note,
          reference.authorityId,
          ...(reference.supports ?? []),
        ]) ?? [],
    },
    {
      label: "Connections",
      values:
        figure.data.relatedConnections?.flatMap((connection) => [
          connection.id,
          connection.note,
          ...(connection.reasons ?? []),
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

export const inferSourceType = (url: string): SourceType => {
  const hostname = new URL(url).hostname.replace(/^www\./, "");

  if (
    hostname.includes("loc.gov") ||
    hostname.includes("archives.gov") ||
    hostname.includes("dp.la") ||
    hostname.includes("snaccooperative.org")
  ) {
    return "archive";
  }

  if (
    hostname.includes("si.edu") ||
    hostname.includes("womenshistory.si.edu") ||
    hostname.includes("computerhistory.org")
  ) {
    return "museum";
  }

  if (
    hostname.includes("viaf.org") ||
    hostname.includes("worldcat.org") ||
    hostname.includes("wikidata.org")
  ) {
    return "authority";
  }

  if (
    hostname.includes("nytimes.com") ||
    hostname.includes("ladyscience.com") ||
    hostname.includes("history.com")
  ) {
    return "article";
  }

  return "reference";
};

export const getReferenceType = (
  reference: NonNullable<FigureEntry["data"]["references"]>[number],
) => reference.type ?? inferSourceType(reference.url);

export const getReferenceTypeData = (figure: FigureEntry) =>
  [
    ...new Set(
      figure.data.references?.map((reference) => getReferenceType(reference)) ?? [],
    ),
  ].join("|");

export const getGroupedReferences = (figure: FigureEntry) => {
  const groups = new Map<
    SourceType,
    NonNullable<FigureEntry["data"]["references"]>
  >();

  for (const reference of figure.data.references ?? []) {
    const type = getReferenceType(reference);
    groups.set(type, [...(groups.get(type) ?? []), reference]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      const order: SourceType[] = [
        "primary",
        "archive",
        "museum",
        "book",
        "article",
        "reference",
        "authority",
      ];
      return order.indexOf(a) - order.indexOf(b);
    })
    .map(([type, references]) => ({ type, references }));
};

export const getResearchTrailLinks = (figure: FigureEntry) =>
  (figure.data.references ?? []).filter((reference) =>
    ["archive", "museum", "authority", "primary"].includes(
      getReferenceType(reference),
    ),
  );

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
  const currentEvents = new Set(
    figure.data.contextEvents?.map((event) => event.label) ?? [],
  );
  const explicitConnections = new Map(
    figure.data.relatedConnections?.map((connection) => [
      connection.id,
      connection,
    ]) ?? [],
  );

  const related = figures
    .filter((candidate) => candidate.id !== figure.id)
    .map((candidate) => {
      const candidateThemes = candidate.data.themes ?? [];
      const candidateOccupations = getOccupations(candidate);
      const candidatePlaces = candidate.data.places?.map((place) => place.name) ?? [];
      const candidateEvents = candidate.data.contextEvents?.map((event) => event.label) ?? [];
      const explicit = explicitConnections.get(candidate.id);
      const reasons = new Set<ConnectionReason>(explicit?.reasons ?? []);

      if (candidateThemes.some((theme) => currentThemes.has(theme))) {
        reasons.add("shared theme");
      }

      if (currentEra && candidate.data.era === currentEra) {
        reasons.add("same era");
      }

      if (candidateOccupations.some((occupation) => currentOccupations.has(occupation))) {
        reasons.add("similar work");
      }

      if (candidatePlaces.some((place) => currentPlaces.has(place))) {
        reasons.add("connected place");
      }

      if (candidateEvents.some((event) => currentEvents.has(event))) {
        reasons.add("shared context event");
      }

      return {
        figure: candidate,
        reasons: [...reasons],
        note: explicit?.note,
        isExplicit: Boolean(explicit),
      };
    })
    .filter(({ reasons }) => reasons.length > 0)
    .sort((a, b) => {
      if (a.isExplicit !== b.isExplicit) return a.isExplicit ? -1 : 1;
      return b.reasons.length - a.reasons.length;
    })
    .slice(0, limit);

  return related satisfies RelatedFigure[];
};
