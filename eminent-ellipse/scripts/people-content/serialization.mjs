import { defaultProfileImage, statusValues } from "./paths.mjs";
import { cleanObject, isPresent, yamlNumber, yamlString, normalizeList } from "./utils.mjs";
import { normalizeConnections, normalizeContextEvents, normalizeOpenQuestions, normalizeReferences } from "./normalize.mjs";

export const pushList = (lines, key, values) => {
  if (!values.length) return;
  lines.push(`${key}:`);
  values.forEach((value) => lines.push(`  - ${yamlString(value)}`));
};

export const pushReferences = (lines, references) => {
  if (!references.length) return;

  lines.push("references:");
  references.forEach((reference) => {
    lines.push(`  - title: ${yamlString(reference.title)}`);
    lines.push(`    url: ${reference.url}`);
    lines.push(`    type: ${reference.type}`);
    if (reference.supports.length) {
      lines.push("    supports:");
      reference.supports.forEach((support) => lines.push(`      - ${yamlString(support)}`));
    }
    lines.push(`    status: ${reference.status}`);
    if (reference.note) lines.push(`    note: ${yamlString(reference.note)}`);
    if (reference.authorityId) lines.push(`    authorityId: ${yamlString(reference.authorityId)}`);
    if (reference.authorityUrl) lines.push(`    authorityUrl: ${reference.authorityUrl}`);
  });
};

export const pushPlaces = (lines, places = []) => {
  const normalized = places
    .map((place) =>
      cleanObject({
        name: place.name?.trim(),
        type: place.type?.trim(),
        latitude: isPresent(place.latitude) ? Number.parseFloat(place.latitude) : undefined,
        longitude: isPresent(place.longitude) ? Number.parseFloat(place.longitude) : undefined,
        startYear: isPresent(place.startYear) ? yamlNumber(place.startYear) : undefined,
        endYear: isPresent(place.endYear) ? yamlNumber(place.endYear) : undefined,
        note: place.note?.trim(),
        status: statusValues.has(place.status) ? place.status : "needs-source",
        source: place.source?.trim(),
      }),
    )
    .filter((place) => place.name);

  if (!normalized.length) return;
  lines.push("places:");
  normalized.forEach((place) => {
    lines.push(`  - name: ${yamlString(place.name)}`);
    Object.entries(place)
      .filter(([key]) => key !== "name")
      .forEach(([key, value]) => {
        if (typeof value === "number") lines.push(`    ${key}: ${value}`);
        else if (key === "source") lines.push(`    ${key}: ${value}`);
        else lines.push(`    ${key}: ${yamlString(value)}`);
      });
  });
};

export const pushContextEvents = (lines, events) => {
  if (!events.length) return;

  lines.push("contextEvents:");
  events.forEach((event) => {
    lines.push(`  - label: ${yamlString(event.label)}`);
    if (event.layer) lines.push(`    layer: ${event.layer}`);
    if (event.thread) lines.push(`    thread: ${yamlString(event.thread)}`);
    if (event.importance) lines.push(`    importance: ${event.importance}`);
    if (Number.isInteger(event.year)) lines.push(`    year: ${event.year}`);
    if (Number.isInteger(event.startYear)) lines.push(`    startYear: ${event.startYear}`);
    if (Number.isInteger(event.endYear)) lines.push(`    endYear: ${event.endYear}`);
    if (event.place) lines.push(`    place: ${yamlString(event.place)}`);
    if (event.note) lines.push(`    note: ${yamlString(event.note)}`);
    lines.push(`    status: ${event.status}`);
    if (event.source) lines.push(`    source: ${event.source}`);
  });
};

export const pushConnections = (lines, connections) => {
  if (!connections.length) return;

  lines.push("relatedConnections:");
  connections.forEach((connection) => {
    lines.push(`  - id: ${yamlString(connection.id)}`);
    if (connection.reasons.length) {
      lines.push("    reasons:");
      connection.reasons.forEach((reason) => lines.push(`      - ${yamlString(reason)}`));
    }
    if (connection.note) lines.push(`    note: ${yamlString(connection.note)}`);
  });
};

export const normalizeImportantWorks = (works = []) =>
  works
    .map((work) => {
      if (typeof work === "string") return work.trim();
      return cleanObject({
        title: work.title?.trim(),
        year: isPresent(work.year) ? yamlNumber(work.year) : undefined,
        startYear: isPresent(work.startYear) ? yamlNumber(work.startYear) : undefined,
        endYear: isPresent(work.endYear) ? yamlNumber(work.endYear) : undefined,
        place: work.place?.trim(),
        note: work.note?.trim(),
        status: statusValues.has(work.status) ? work.status : "needs-source",
        source: work.source?.trim(),
      });
    })
    .filter((work) => (typeof work === "string" ? work : work.title));

export const pushImportantWorks = (lines, works = []) => {
  const normalized = normalizeImportantWorks(works);
  if (!normalized.length) return;
  lines.push("importantWorks:");
  normalized.forEach((work) => {
    if (typeof work === "string") {
      lines.push(`  - ${yamlString(work)}`);
      return;
    }
    lines.push(`  - title: ${yamlString(work.title)}`);
    Object.entries(work)
      .filter(([key]) => key !== "title")
      .forEach(([key, value]) => {
        if (typeof value === "number") lines.push(`    ${key}: ${value}`);
        else if (key === "source") lines.push(`    ${key}: ${value}`);
        else lines.push(`    ${key}: ${yamlString(value)}`);
      });
  });
};

export const normalizeStorySeeds = (seeds = []) =>
  seeds
    .map((seed) =>
      cleanObject({
        title: seed.title?.trim(),
        year: isPresent(seed.year) ? yamlNumber(seed.year) : undefined,
        startYear: isPresent(seed.startYear) ? yamlNumber(seed.startYear) : undefined,
        endYear: isPresent(seed.endYear) ? yamlNumber(seed.endYear) : undefined,
        prompt: seed.prompt?.trim(),
        note: seed.note?.trim(),
        status: statusValues.has(seed.status) ? seed.status : "needs-source",
        source: seed.source?.trim(),
      }),
    )
    .filter((seed) => seed.title && seed.prompt);

export const pushStorySeeds = (lines, seeds = []) => {
  const normalized = normalizeStorySeeds(seeds);
  if (!normalized.length) return;
  lines.push("storySeeds:");
  normalized.forEach((seed) => {
    lines.push(`  - title: ${yamlString(seed.title)}`);
    Object.entries(seed)
      .filter(([key]) => key !== "title")
      .forEach(([key, value]) => {
        if (typeof value === "number") lines.push(`    ${key}: ${value}`);
        else if (key === "source") lines.push(`    ${key}: ${value}`);
        else lines.push(`    ${key}: ${yamlString(value)}`);
      });
  });
};

export const buildDraftSource = (input = {}) => {
  const name = input.name?.trim() || "Untitled Draft";
  const summary = input.summary?.trim() || "Draft profile awaiting human review.";
  const occupations = normalizeList(input.occupations ?? input.occupation);
  const nationalities = normalizeList(input.nationalities ?? input.nationality);
  const tags = normalizeList(input.tags);
  const themes = normalizeList(input.themes);
  const eras = normalizeList(input.eras ?? input.era);
  const openQuestions = normalizeOpenQuestions(input.openQuestions);
  const references = normalizeReferences(input.references);
  const contextEvents = normalizeContextEvents(input.contextEvents);
  const relatedConnections = normalizeConnections(input.relatedConnections);
  const sourceCredit = input.sourceCredit?.trim() || "Local draft awaiting source review";
  const body =
    input.body?.trim() ||
    [
      summary,
      "",
      "Review checklist:",
      "- Confirm name, dates, places, and occupation metadata.",
      "- Verify proposed references and source notes before promotion.",
      "- Mark generated or proposed enrichment as reviewed only after manual acceptance.",
      "- Replace placeholder image and alt text when a reliable image source is available.",
    ].join("\n");
  const imageSrc = input.image?.src?.trim() || input.imageSrc?.trim() || defaultProfileImage;
  const imageAlt =
    input.image?.alt?.trim() || input.imageAlt?.trim() || `Draft placeholder image for ${name}`;

  const lines = [
    "---",
    `name: ${yamlString(name)}`,
    "draft: true",
    "reviewed: false",
    `summary: ${yamlString(summary)}`,
  ];

  if (isPresent(input.lifespan)) lines.push(`lifespan: ${yamlString(input.lifespan)}`);
  if (isPresent(input.birthYear)) lines.push(`birthYear: ${yamlNumber(input.birthYear)}`);
  if (isPresent(input.deathYear)) lines.push(`deathYear: ${yamlNumber(input.deathYear)}`);
  lines.push(`dateStatus: ${statusValues.has(input.dateStatus) ? input.dateStatus : "needs-source"}`);
  if (nationalities.length) {
    pushList(lines, "nationalities", nationalities);
    lines.push(`nationality: ${yamlString(nationalities.join(", "))}`);
  } else if (isPresent(input.nationality)) {
    lines.push(`nationality: ${yamlString(input.nationality)}`);
  }
  if (occupations.length) {
    pushList(lines, "occupations", occupations);
    lines.push(`occupation: ${yamlString(occupations.join(", "))}`);
  } else if (isPresent(input.occupation)) {
    lines.push(`occupation: ${yamlString(input.occupation)}`);
  }
  if (eras.length) {
    pushList(lines, "eras", eras);
    lines.push(`era: ${yamlString(eras.join(", "))}`);
  } else if (isPresent(input.era)) {
    lines.push(`era: ${yamlString(input.era)}`);
  }
  pushList(lines, "tags", tags);
  pushList(lines, "themes", themes);
  lines.push(`sourceCredit: ${yamlString(sourceCredit)}`);
  lines.push("sourceCoverageStatus: needs-source");
  lines.push("sourceStrength: needs-review");
  pushList(lines, "openQuestions", openQuestions);
  if (isPresent(input.originalInstagramUrl)) {
    lines.push(`originalInstagramUrl: ${yamlString(input.originalInstagramUrl)}`);
  }
  pushPlaces(lines, input.places ?? []);
  pushContextEvents(lines, contextEvents);
  lines.push("image:");
  lines.push(`  src: ${imageSrc}`);
  lines.push(`  alt: ${yamlString(imageAlt)}`);
  pushImportantWorks(lines, input.importantWorks ?? []);
  pushStorySeeds(lines, input.storySeeds ?? []);
  pushConnections(lines, relatedConnections);
  pushReferences(lines, references);
  lines.push("---");

  return `${lines.join("\n")}\n\n${body}\n`;
};
