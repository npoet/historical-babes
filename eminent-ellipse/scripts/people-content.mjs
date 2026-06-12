import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, "..");

export const figuresDir = path.join(
  projectRoot,
  "src",
  "content",
  "figures"
);

export const draftsDir = path.join(
  projectRoot,
  "src",
  "content",
  "drafts",
  "figures"
);

export const defaultProfileImage =
  "/images/profile-placeholder.svg";


const allowedSourceTypes = new Set([
  "primary",
  "archive",
  "museum",
  "book",
  "article",
  "reference",
  "authority",
]);

const allowedSourceSupports = new Set([
  "dates",
  "place",
  "work",
  "context event",
  "image",
  "quote",
  "background",
]);

const allowedConnectionReasons = new Set([
  "shared theme",
  "similar work",
  "same era",
  "connected place",
  "shared context event",
  "historical thread",
]);

const statusValues = new Set(["reviewed", "approximate", "needs-source"]);

export const slugify = (value) =>
  value
    .toString()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-");

const yamlString = (value) => JSON.stringify(value ?? "");
const yamlNumber = (value) => Number.parseInt(value, 10);
const isPresent = (value) => value !== undefined && value !== null && value !== "";
const cleanObject = (object) =>
  Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length),
    ),
  );

const normalizeList = (value) => {
  if (Array.isArray(value)) return value.map((item) => item.toString().trim()).filter(Boolean);
  if (!value) return [];
  return value
    .toString()
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeReferences = (references = []) =>
  references
    .map((reference) => ({
      title: reference.title?.trim(),
      url: reference.url?.trim(),
      type: allowedSourceTypes.has(reference.type) ? reference.type : "reference",
      supports: normalizeList(reference.supports),
      status: statusValues.has(reference.status) ? reference.status : "needs-source",
      note: reference.note?.trim(),
      authorityId: reference.authorityId?.trim(),
      authorityUrl: reference.authorityUrl?.trim(),
    }))
    .filter((reference) => reference.title && reference.url);

const normalizeConnections = (connections = []) =>
  connections
    .map((connection) => ({
      id: slugify(connection.id ?? ""),
      reasons: normalizeList(connection.reasons),
      note: connection.note?.trim(),
    }))
    .filter((connection) => connection.id);

const normalizeContextEvents = (events = []) =>
  events
    .map((event) => ({
      label: event.label?.trim(),
      layer: ["personal", "impact", "world"].includes(event.layer) ? event.layer : undefined,
      thread: event.thread?.trim(),
      importance: ["major", "supporting"].includes(event.importance) ? event.importance : undefined,
      year: isPresent(event.year) ? yamlNumber(event.year) : undefined,
      startYear: isPresent(event.startYear) ? yamlNumber(event.startYear) : undefined,
      endYear: isPresent(event.endYear) ? yamlNumber(event.endYear) : undefined,
      place: event.place?.trim(),
      note: event.note?.trim(),
      status: statusValues.has(event.status) ? event.status : "needs-source",
      source: event.source?.trim(),
    }))
    .filter((event) => event.label);

const normalizeOpenQuestions = (questions) => normalizeList(questions);

const frontmatterOf = (source) => {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);

  if (!match) {
    return { frontmatter: "", body: source };
  }

  return {
    frontmatter: match[1],
    body: source.slice(match[0].length),
  };
};

const parseScalar = (value) => {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
};

const parseInlineEntry = (value) => {
  const match = value.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
  if (!match) return parseScalar(value);
  return { [match[1]]: match[2] ? parseScalar(match[2]) : "" };
};

const parseIndentedBlock = (lines, startIndex) => {
  const first = lines[startIndex + 1];
  if (!first || (!/^\s+/.test(first) && !/^-\s+/.test(first))) return { value: undefined, endIndex: startIndex };

  if (/^\s*-\s+/.test(first)) {
    const items = [];
    let index = startIndex + 1;
    let current = null;
    let pendingArrayKey = null;

    for (; index < lines.length; index += 1) {
      const line = lines[index];
      if (!/^\s+/.test(line) && !/^-\s+/.test(line)) break;

      const item = line.match(/^\s*-\s+(.*)$/);
      if (item) {
        const parsed = parseInlineEntry(item[1]);
        if (current && pendingArrayKey && typeof parsed === "string") {
          current[pendingArrayKey].push(parsed);
          continue;
        }
        pendingArrayKey = null;
        if (current) items.push(current);
        current = typeof parsed === "object" && parsed !== null ? parsed : parsed;
        continue;
      }

      if (!current || typeof current !== "object") continue;

      const pair = line.match(/^\s+([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
      if (pair) {
        pendingArrayKey = null;
        const [, key, rawValue] = pair;
        if (rawValue) {
          current[key] = parseScalar(rawValue);
        } else {
          current[key] = [];
          pendingArrayKey = key;
        }
      }
    }

    if (current) items.push(current);
    return { value: items, endIndex: index - 1 };
  }

  const object = {};
  let index = startIndex + 1;
  for (; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^\s+/.test(line)) break;
    const pair = line.match(/^\s+([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (pair) object[pair[1]] = pair[2] ? parseScalar(pair[2]) : "";
  }

  return { value: object, endIndex: index - 1 };
};

export const parseFrontmatterSummary = (frontmatter) => {
  const data = {};
  const lines = frontmatter.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const scalar = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);

    if (!scalar) continue;

    const [, key, value] = scalar;
    if (value) {
      data[key] = parseScalar(value);
      continue;
    }

    if (lines[index + 1]?.match(/^\s+|^-\s+/)) {
      const parsed = parseIndentedBlock(lines, index);
      data[key] = parsed.value;
      index = parsed.endIndex;
    }
  }

  return data;
};

const readMdxFiles = async (dir, kind) => {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
      .map((entry) => ({
        id: path.basename(entry.name, ".mdx"),
        kind,
        file: path.join(dir, entry.name),
      }));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

export const listProfiles = async () => {
  const files = [
    ...(await readMdxFiles(figuresDir, "published")),
    ...(await readMdxFiles(draftsDir, "draft")),
  ];

  const profiles = await Promise.all(
    files.map(async (profile) => {
      const source = await readFile(profile.file, "utf8");
      const { frontmatter } = frontmatterOf(source);
      const data = parseFrontmatterSummary(frontmatter);

      return {
        id: profile.id,
        kind: profile.kind,
        name: data.name || profile.id,
        summary: data.summary || "",
        occupations: data.occupations || normalizeList(data.occupation),
        nationalities: data.nationalities || normalizeList(data.nationality),
        tags: data.tags || [],
        themes: data.themes || [],
        eras: data.eras || normalizeList(data.era),
        era: data.era || "",
        places: (data.places || []).map((place) => place.name).filter(Boolean),
        contextThreads: (data.contextEvents || []).map((event) => event.thread).filter(Boolean),
        referenceSupports: (data.references || []).flatMap((reference) => normalizeList(reference.supports)),
        relatedReasons: (data.relatedConnections || []).flatMap((connection) => normalizeList(connection.reasons)),
        reviewed: data.reviewed,
        draft: data.draft,
        file: path.relative(projectRoot, profile.file),
      };
    }),
  );

  return profiles.sort((a, b) => a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind));
};

export const readProfile = async (kind, id) => {
  const dir = kind === "draft" ? draftsDir : figuresDir;
  const file = path.join(dir, `${slugify(id)}.mdx`);
  const source = await readFile(file, "utf8");
  const { frontmatter, body } = frontmatterOf(source);

  return {
    id: slugify(id),
    kind,
    frontmatter,
    body,
    data: parseFrontmatterSummary(frontmatter),
    source,
  };
};

const pushList = (lines, key, values) => {
  if (!values.length) return;
  lines.push(`${key}:`);
  values.forEach((value) => lines.push(`  - ${yamlString(value)}`));
};

const pushReferences = (lines, references) => {
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

const pushPlaces = (lines, places = []) => {
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

const pushContextEvents = (lines, events) => {
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

const pushConnections = (lines, connections) => {
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

const normalizeImportantWorks = (works = []) =>
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

const pushImportantWorks = (lines, works = []) => {
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

const normalizeStorySeeds = (seeds = []) =>
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

const pushStorySeeds = (lines, seeds = []) => {
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

export const createDraft = async (input = {}) => {
  await mkdir(draftsDir, { recursive: true });
  const id = slugify(input.slug || input.name || "untitled-draft");
  if (!id) throw new Error("Draft needs a name or slug.");
  const file = path.join(draftsDir, `${id}.mdx`);
  const source = buildDraftSource(input);
  await writeFile(file, source, { encoding: "utf8", flag: input.overwrite ? "w" : "wx" });

  return { id, file: path.relative(projectRoot, file) };
};

const forceDraftFlags = (frontmatter) => {
  const lines = frontmatter
    .split("\n")
    .filter((line) => !/^draft:\s*/.test(line) && !/^reviewed:\s*/.test(line));
  const nameIndex = lines.findIndex((line) => /^name:\s*/.test(line));
  const insertAt = nameIndex >= 0 ? nameIndex + 1 : 0;
  lines.splice(insertAt, 0, "draft: true", "reviewed: false");
  return lines.join("\n");
};

const forcePublishedFlags = (frontmatter) => {
  const lines = frontmatter
    .split("\n")
    .filter((line) => !/^draft:\s*/.test(line) && !/^reviewed:\s*/.test(line));
  const nameIndex = lines.findIndex((line) => /^name:\s*/.test(line));
  const insertAt = nameIndex >= 0 ? nameIndex + 1 : 0;
  lines.splice(insertAt, 0, "reviewed: true");
  return lines.join("\n");
};

const hasUnreviewedMarkers = (source) =>
  /(^|\s)(needs-source|needs-review)(\s|$)/m.test(source) || /^reviewed:\s*false\s*$/m.test(source);

export const copyProfileToDraft = async (id, options = {}) => {
  await mkdir(draftsDir, { recursive: true });
  const published = await readProfile("published", id);
  const draftId = slugify(options.slug || published.id);
  const file = path.join(draftsDir, `${draftId}.mdx`);
  const source = `---\n${forceDraftFlags(published.frontmatter)}\n---\n\n${published.body.trim()}\n`;

  await writeFile(file, source, { encoding: "utf8", flag: options.overwrite ? "w" : "wx" });

  return { id: draftId, file: path.relative(projectRoot, file) };
};

export const saveDraftSource = async (id, frontmatter, body) => {
  await mkdir(draftsDir, { recursive: true });
  const file = path.join(draftsDir, `${slugify(id)}.mdx`);
  const source = `---\n${forceDraftFlags(frontmatter.trim())}\n---\n\n${body.trim()}\n`;
  await writeFile(file, `${source}\n`, "utf8");
  return { id: slugify(id), file: path.relative(projectRoot, file) };
};

export const promoteDraft = async (id, options = {}) => {
  const draft = await readProfile("draft", id);
  const publishedId = slugify(options.slug || draft.id);
  const publishedFile = path.join(figuresDir, `${publishedId}.mdx`);

  if (!options.force && hasUnreviewedMarkers(draft.source)) {
    throw new Error(
      "Draft still contains needs-source, needs-review, or reviewed: false. Review it first or pass --force.",
    );
  }

  await mkdir(figuresDir, { recursive: true });
  const source = `---\n${forcePublishedFlags(draft.frontmatter)}\n---\n\n${draft.body.trim()}\n`;
  await writeFile(publishedFile, `${source}\n`, {
    encoding: "utf8",
    flag: options.overwrite ? "w" : "wx",
  });

  if (options.deleteDraft) {
    await rm(path.join(draftsDir, `${draft.id}.mdx`), { force: true });
  }

  return { id: publishedId, file: path.relative(projectRoot, publishedFile) };
};

export const demotePublished = async (id, options = {}) => {
  await mkdir(draftsDir, { recursive: true });
  const published = await readProfile("published", id);
  const draftId = slugify(options.slug || published.id);
  const draftFile = path.join(draftsDir, `${draftId}.mdx`);
  const source = `---\n${forceDraftFlags(published.frontmatter)}\n---\n\n${published.body.trim()}\n`;

  await writeFile(draftFile, `${source}\n`, {
    encoding: "utf8",
    flag: options.overwrite ? "w" : "wx",
  });

  if (!options.keepPublished) {
    await rm(path.join(figuresDir, `${published.id}.mdx`), { force: true });
  }

  return { id: draftId, file: path.relative(projectRoot, draftFile) };
};

export const deleteProfile = async (kind, id) => {
  if (!["published", "draft"].includes(kind)) {
    throw new Error("delete requires kind published|draft");
  }

  const profile = await readProfile(kind, id);
  await rm(profile.kind === "draft" ? path.join(draftsDir, `${profile.id}.mdx`) : path.join(figuresDir, `${profile.id}.mdx`), {
    force: true,
  });

  return { id: profile.id, kind: profile.kind };
};

export const cleanupDraft = async (id) => {
  const profile = await readProfile("draft", id);
  await rm(path.join(draftsDir, `${profile.id}.mdx`), { force: true });

  return { id: profile.id, kind: "draft", cleanup: "draft-only" };
};

export const validateDraftInput = (input = {}) => {
  const findings = [];
  const references = normalizeReferences(input.references);
  const contextEvents = normalizeContextEvents(input.contextEvents);
  const connections = normalizeConnections(input.relatedConnections);

  if (!input.name?.trim()) findings.push("name is required");
  if (!input.summary?.trim()) findings.push("summary is recommended before promotion");
  if (!input.image?.src && !input.imageSrc) findings.push("image src will use the local placeholder");
  if (!input.image?.alt && !input.imageAlt) findings.push("image alt text will use a draft placeholder");

  references.forEach((reference) => {
    if (reference.status === "reviewed") {
      findings.push(`reference "${reference.title}" is proposed by local tooling and should stay needs-source until manually accepted`);
    }
  });

  contextEvents.forEach((event) => {
    if (event.status === "reviewed") {
      findings.push(`context event "${event.label}" should stay needs-source until manually accepted`);
    }
  });

  return {
    ok: findings.length === 0,
    findings,
    normalized: {
      ...input,
      references: references.map((reference) => ({ ...reference, status: "needs-source" })),
      contextEvents: contextEvents.map((event) => ({ ...event, status: "needs-source" })),
      relatedConnections: connections,
    },
  };
};

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
