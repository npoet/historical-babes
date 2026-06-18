import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { draftsDir, figuresDir, projectRoot } from "./paths.mjs";
import { buildDraftSource } from "./serialization.mjs";
import { frontmatterOf, parseFrontmatterSummary } from "./frontmatter.mjs";
import { normalizeConnections, normalizeContextEvents, normalizeReferences } from "./normalize.mjs";
import { normalizeList, slugify } from "./utils.mjs";

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

