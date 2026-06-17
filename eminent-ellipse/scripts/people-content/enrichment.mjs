import { allowedConnectionReasons } from "./paths.mjs";
import { normalizeConnections, normalizeContextEvents, normalizeOpenQuestions, normalizeReferences } from "./normalize.mjs";
import { normalizeList, slugify } from "./utils.mjs";

const lowerSet = (values = []) => new Set(normalizeList(values).map((value) => value.toLowerCase()));
const matchingValues = (left = [], right = []) => {
  const rightValues = lowerSet(right);
  return normalizeList(left).filter((value) => rightValues.has(value.toLowerCase()));
};
const placeNames = (places = []) =>
  places.map((place) => (typeof place === "string" ? place : place.name)).filter(Boolean);
const threadNames = (events = []) =>
  events.map((event) => (typeof event === "string" ? event : event.thread)).filter(Boolean);

const likelyRelatedPeople = (input = {}) => {
  const currentId = slugify(input.id || input.slug || input.name || "");
  const inputPlaces = placeNames(input.places);
  const inputThreads = threadNames(input.contextEvents);

  return (input.profiles || [])
    .filter((profile) => profile.id !== currentId)
    .map((profile) => {
      const reasons = [];
      const evidence = [];

      const sharedTags = matchingValues(input.tags, profile.tags);
      const sharedThemes = matchingValues(input.themes, profile.themes);
      const sharedOccupations = matchingValues(input.occupations ?? input.occupation, profile.occupations);
      const sharedPlaces = matchingValues(inputPlaces, profile.places);
      const sharedThreads = matchingValues(inputThreads, profile.contextThreads);
      const sameEra = input.era && profile.era && input.era.toLowerCase() === profile.era.toLowerCase();

      if (sharedThemes.length) {
        reasons.push("shared theme");
        evidence.push(`themes: ${sharedThemes.join(", ")}`);
      }
      if (sharedOccupations.length) {
        reasons.push("similar work");
        evidence.push(`occupations: ${sharedOccupations.join(", ")}`);
      }
      if (sameEra) {
        reasons.push("same era");
        evidence.push(`era: ${profile.era}`);
      }
      if (sharedPlaces.length) {
        reasons.push("connected place");
        evidence.push(`places: ${sharedPlaces.join(", ")}`);
      }
      if (sharedThreads.length) {
        reasons.push("shared context event", "historical thread");
        evidence.push(`threads: ${sharedThreads.join(", ")}`);
      }
      if (sharedTags.length && !reasons.includes("shared theme")) {
        reasons.push("shared theme");
        evidence.push(`tags: ${sharedTags.join(", ")}`);
      }

      const score =
        sharedThemes.length * 3 +
        sharedOccupations.length * 3 +
        sharedThreads.length * 3 +
        sharedPlaces.length * 2 +
        sharedTags.length +
        (sameEra ? 2 : 0);

      return {
        id: profile.id,
        name: profile.name,
        reasons: [...new Set(reasons)].filter((reason) => allowedConnectionReasons.has(reason)),
        evidence,
        reviewStatus: "needs-review",
        score,
      };
    })
    .filter((profile) => profile.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 6)
    .map(({ score, ...profile }) => profile);
};

export const proposeEnrichment = (input = {}) => {
  const name = input.name?.trim() || "this person";
  const sourceNote =
    input.sourceNote?.trim() ||
    "Prefer museums, archives, libraries, universities, primary-source collections, books/articles, authority records, and reputable reference sources.";
  const relatedPeople = likelyRelatedPeople(input);
  const occupationLabel = normalizeList(input.occupations ?? input.occupation).join(", ") || "work";
  const mainTheme = normalizeList(input.themes)[0] || normalizeList(input.tags)[0] || "historical context";
  const primaryThread = threadNames(input.contextEvents)[0] || `${mainTheme} across time`;
  const firstPlace = placeNames(input.places)[0] || "the places connected to this profile";
  const dateConfidence = input.birthYear || input.lifespan ? "needs-review" : "missing";
  const placeConfidence = input.places?.length ? "needs-review" : "missing";

  return {
    reviewed: false,
    reviewStatus: "needs-review",
    sourceNote,
    sourceGaps: [
      {
        field: "dates",
        status: "needs-source",
        prompt: `Find an authority, archive, museum, or reliable reference source for ${name}'s birth/death dates or lifespan.`,
      },
      {
        field: "places",
        status: "needs-source",
        prompt: `Find direct support for ${name}'s key places, including coordinates only when a source can justify the location.`,
      },
      {
        field: "works and impact",
        status: "needs-source",
        prompt: `Identify primary, museum, archive, book, or article support for ${name}'s roles, work, and impact${occupationLabel === "work" ? "" : ` as ${occupationLabel}`}.`,
      },
    ],
    factConfidenceIssues: [
      { field: "dates", confidence: dateConfidence, reviewStatus: "needs-review" },
      { field: "places", confidence: placeConfidence, reviewStatus: "needs-review" },
      {
        field: "context links",
        confidence: input.contextEvents?.length ? "needs-review" : "missing",
        reviewStatus: "needs-review",
      },
    ],
    references: normalizeReferences(input.references).map((reference) => ({
      ...reference,
      status: "needs-source",
    })),
    missingConfidence: {
      dates: input.birthYear || input.lifespan ? "needs-review" : "missing",
      places: input.places?.length ? "needs-review" : "missing",
    },
    relatedConnections: normalizeConnections(input.relatedConnections),
    likelyRelatedPeople: relatedPeople,
    contextEvents: normalizeContextEvents(input.contextEvents).map((event) => ({
      ...event,
      status: "needs-source",
    })),
    relevantWorldEvents: [
      {
        label: `${mainTheme} context around ${name}`,
        layer: "world",
        thread: primaryThread,
        place: firstPlace,
        note: `Review whether broader events, laws, institutions, wars, movements, or cultural shifts shaped ${name}'s choices and reception.`,
        status: "needs-source",
      },
    ],
    worldContextLinks: normalizeContextEvents(input.worldContextLinks ?? [])
      .filter((event) => event.layer === "world")
      .map((event) => ({ ...event, status: "needs-source" })),
    storyPrompts: [
      {
        title: `${name} and ${mainTheme}`,
        prompt: `Trace one sourced episode where ${name}'s work${occupationLabel === "work" ? "" : ` as ${occupationLabel}`} intersected with ${mainTheme}.`,
        status: "needs-source",
      },
    ],
    multiPersonPaths: relatedPeople.slice(0, 3).map((person) => ({
      title: `${name} -> ${person.name}`,
      people: [slugify(input.id || input.name || ""), person.id].filter(Boolean),
      reasons: person.reasons,
      status: "needs-review",
    })),
    longPeriodNarrativeThreads: [
      {
        thread: primaryThread,
        status: "needs-review",
        prompt: `Connect ${name} to earlier and later profiles through sourced changes in ${mainTheme}, institutions, places, and public memory.`,
      },
    ],
    openQuestions: normalizeOpenQuestions(input.openQuestions).length
      ? normalizeOpenQuestions(input.openQuestions)
      : [
          `Which reliable sources best support ${name}'s dates and places?`,
          `Which context events are directly relevant rather than merely contemporary?`,
        ],
  };
};
