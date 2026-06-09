import type { CollectionEntry } from "astro:content";

export type FigureEntry = CollectionEntry<"figures">;

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
  const currentTerms = new Set([
    figure.data.era,
    figure.data.nationality,
    ...getOccupations(figure),
    ...(figure.data.tags ?? []),
    ...(figure.data.themes ?? []),
  ].filter(Boolean));

  return figures
    .filter((candidate) => candidate.id !== figure.id)
    .map((candidate) => {
      const candidateTerms = [
        candidate.data.era,
        candidate.data.nationality,
        ...getOccupations(candidate),
        ...(candidate.data.tags ?? []),
        ...(candidate.data.themes ?? []),
      ].filter(Boolean);

      const score = candidateTerms.filter((term) =>
        currentTerms.has(term),
      ).length;

      return { candidate, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
};
