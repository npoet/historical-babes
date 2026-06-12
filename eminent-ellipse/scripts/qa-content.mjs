import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { editorPage, checkEditorPageScript } from "./local-people-editor.mjs";
import {
  cleanupDraft,
  copyProfileToDraft,
  createDraft,
  demotePublished,
  promoteDraft,
  proposeEnrichment,
  readProfile,
} from "./people-content.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const figuresDir = path.join(root, "src/content/figures");
const draftsDir = path.join(root, "src/content/drafts/figures");

const readMdxFiles = async (dir) => {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
      .map((entry) => path.join(dir, entry.name));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const frontmatterOf = (source) => {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  return match?.[1] ?? "";
};

const hasValue = (frontmatter, key) =>
  new RegExp(`^${key}:\\s*\\S`, "m").test(frontmatter);

const hasBlock = (frontmatter, key) =>
  new RegExp(`^${key}:\\s*\\n(?:\\s*-|\\s+\\w+:)`, "m").test(frontmatter);

const blockOf = (frontmatter, key) => {
  const lines = frontmatter.split("\n");
  const start = lines.findIndex((line) => line === `${key}:`);

  if (start === -1) return "";

  const block = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    block.push(line);
  }

  return block.join("\n");
};

const countMatches = (source, pattern) => (source.match(pattern) ?? []).length;
const lineHasSource = (line) => /^\s+source:\s*["']?https?:\/\//.test(line);
const lineHasStatus = (line) => /^\s+status:\s*(reviewed|approximate|needs-source)$/.test(line);

const countReviewedItemsWithoutSource = (block) => {
  const lines = block.split("\n");
  let missing = 0;
  let itemHasReviewedStatus = false;
  let itemHasSource = false;

  const flush = () => {
    if (itemHasReviewedStatus && !itemHasSource) missing++;
    itemHasReviewedStatus = false;
    itemHasSource = false;
  };

  for (const line of lines) {
    if (/^\s+-\s+/.test(line)) flush();
    if (lineHasStatus(line) && line.includes("reviewed")) itemHasReviewedStatus = true;
    if (lineHasSource(line)) itemHasSource = true;
  }

  flush();
  return missing;
};

const parseListItems = (block) => {
  const lines = block.split("\n");
  const items = [];
  let current = null;

  for (const line of lines) {
    if (/^\s+-\s+/.test(line)) {
      if (current) items.push(current);
      current = {};
    }

    const match = line.match(/^\s+([a-zA-Z]+):\s*(.*)$/);
    if (match && current) {
      current[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }

  if (current) items.push(current);

  return items;
};

const findings = [];
const warnings = [];
const publicFiles = await readMdxFiles(figuresDir);
const draftFiles = await readMdxFiles(draftsDir);
const runEditorHealthCheck = () => {
  try {
    execFileSync(process.execPath, [path.join(root, "scripts/local-people-editor.mjs")], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        PEOPLE_EDITOR_HEALTHCHECK: "1",
        PEOPLE_EDITOR_PORT: "0",
      },
      stdio: "pipe",
    });
  } catch (error) {
    const output = [error.stdout, error.stderr, error.message].filter(Boolean).join("\n").trim();
    findings.push(`people:editor health check failed${output ? `: ${output}` : ""}`);
  }
};

const runImportSmokeCheck = async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "historical-babes-import-"));
  const inputFile = path.join(tempDir, "import-smoke.md");
  const smokeTitle = `QA Import Smoke Draft ${process.pid}`;
  const draftFile = path.join(draftsDir, `qa-import-smoke-draft-${process.pid}.mdx`);

  try {
    await writeFile(
      inputFile,
      [`# ${smokeTitle}`, "", "Temporary import validation draft."].join("\n"),
      "utf8",
    );

    execFileSync(process.execPath, [path.join(root, "scripts/import-drafts.mjs"), "--input", inputFile], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    const output = [error.stdout, error.stderr, error.message].filter(Boolean).join("\n").trim();
    findings.push(`import:drafts smoke check failed${output ? `: ${output}` : ""}`);
  } finally {
    await rm(draftFile, { force: true });
    await rm(tempDir, { recursive: true, force: true });
  }
};

const runStructuredEditorChecks = async () => {
  try {
    checkEditorPageScript(editorPage);
  } catch (error) {
    findings.push(`people:editor inline script syntax failed: ${error.message}`);
  }

  const requiredEditorSnippets = [
    'id="occupations" class="token-list"',
    'id="themes" class="token-list"',
    'id="tags" class="token-list"',
    'id="openQuestions" class="token-list"',
    "data-token-row-add",
    'tokenControlHtml("supports"',
    'tokenControlHtml("reasons"',
    'id="supportSuggestions"',
    'id="reasonSuggestions"',
    'id="cleanupDraft"',
    '"/api/cleanup-draft"',
  ];

  requiredEditorSnippets.forEach((snippet) => {
    if (!editorPage.includes(snippet)) {
      findings.push(`people:editor missing structured control or enrichment wiring snippet: ${snippet}`);
    }
  });

  try {
    const ada = await readProfile("published", "ada-lovelace");
    const nestedKeys = [
      "places",
      "contextEvents",
      "references",
      "relatedConnections",
      "importantWorks",
      "storySeeds",
      "openQuestions",
    ];

    nestedKeys.forEach((key) => {
      if (!Array.isArray(ada.data[key]) || ada.data[key].length === 0) {
        findings.push(`people:editor Ada Lovelace nested field did not parse: ${key}`);
      }
    });

    const proposal = proposeEnrichment({
      id: "ada-lovelace",
      name: "Ada Lovelace",
      birthYear: 1815,
      era: ada.data.era,
      occupations: ada.data.occupations,
      tags: ada.data.tags,
      themes: ada.data.themes,
      places: ada.data.places,
      contextEvents: ada.data.contextEvents,
      profiles: [
        {
          id: "ada-lovelace",
          name: "Ada Lovelace",
          occupations: ada.data.occupations,
          tags: ada.data.tags,
          themes: ada.data.themes,
          era: ada.data.era,
          places: ada.data.places.map((place) => place.name),
          contextThreads: ada.data.contextEvents.map((event) => event.thread).filter(Boolean),
        },
        {
          id: "m-ria-telkes",
          name: "Maria Telkes",
          occupations: ["Scientist"],
          tags: ["Science and Innovation"],
          themes: ["Science and Innovation"],
          era: ada.data.era,
          places: ["London, England"],
          contextThreads: ada.data.contextEvents.map((event) => event.thread).filter(Boolean),
        },
      ],
    });

    const proposalArrays = [
      "sourceGaps",
      "factConfidenceIssues",
      "likelyRelatedPeople",
      "relevantWorldEvents",
      "storyPrompts",
      "multiPersonPaths",
      "longPeriodNarrativeThreads",
    ];

    proposalArrays.forEach((key) => {
      if (!Array.isArray(proposal[key]) || proposal[key].length === 0) {
        findings.push(`people:enrichment missing review-first output array: ${key}`);
      }
    });

    const unreviewedWorldEvents = proposal.relevantWorldEvents.every((event) => event.status === "needs-source");
    const unreviewedPaths = proposal.multiPersonPaths.every((item) => item.status === "needs-review");
    if (!unreviewedWorldEvents || !unreviewedPaths || proposal.reviewStatus !== "needs-review") {
      findings.push("people:enrichment proposed facts must remain needs-source or needs-review");
    }
  } catch (error) {
    findings.push(`people:structured editor regression check failed: ${error.message}`);
  }
};

const runLifecycleSmokeCheck = async () => {
  const slug = `qa-lifecycle-${process.pid}`;
  const copiedSlug = `${slug}-copy`;
  const demotedSlug = `${slug}-demoted`;
  let promoted = false;

  try {
    await copyProfileToDraft("ada-lovelace", { slug: copiedSlug, overwrite: true });

    await createDraft({
      slug,
      name: "QA Lifecycle Draft",
      summary: "Temporary lifecycle validation draft.",
      references: [
        {
          title: "QA Reference",
          url: "https://example.com/qa-reference",
          type: "reference",
          supports: ["dates", "custom archival clue"],
          status: "needs-source",
        },
      ],
      relatedConnections: [
        {
          id: "ada-lovelace",
          reasons: ["shared theme", "custom editorial pairing"],
          note: "Temporary QA relationship.",
        },
      ],
      storySeeds: [
        {
          title: "Needs-source prompt with no URL",
          year: 1843,
          prompt: "Trace a representative draft story prompt that still needs a source URL.",
          status: "needs-source",
          source: "",
        },
      ],
      overwrite: true,
    });

    const draft = await readProfile("draft", slug);
    const supports = draft.data.references?.[0]?.supports ?? [];
    const reasons = draft.data.relatedConnections?.[0]?.reasons ?? [];
    const storySeed = draft.data.storySeeds?.find((seed) => seed.title === "Needs-source prompt with no URL");

    if (!supports.includes("custom archival clue")) {
      findings.push("people:content custom reference supports were not preserved in draft generation");
    }

    if (!reasons.includes("custom editorial pairing")) {
      findings.push("people:content custom related-connection reasons were not preserved in draft generation");
    }

    if (!storySeed || storySeed.status !== "needs-source" || storySeed.source) {
      findings.push("people:content blank-source needs-source story prompt was not preserved as schema-compatible draft data");
    }

    try {
      execFileSync("npm", ["run", "build"], {
        cwd: root,
        encoding: "utf8",
        stdio: "pipe",
      });
    } catch (error) {
      const output = [error.stdout, error.stderr, error.message].filter(Boolean).join("\n").trim();
      findings.push(`people:content schema build failed with custom editor draft${output ? `: ${output}` : ""}`);
    }

    let blockedPromotion = false;
    try {
      await promoteDraft(slug, { slug, overwrite: true });
    } catch (error) {
      blockedPromotion = /needs-source|needs-review|reviewed: false/.test(error.message);
    }

    if (!blockedPromotion) {
      findings.push("people:lifecycle unreviewed draft promotion was not blocked");
    }

    await promoteDraft(slug, { slug, overwrite: true, force: true });
    promoted = true;
    await demotePublished(slug, { slug: demotedSlug, overwrite: true });
    promoted = false;
  } catch (error) {
    findings.push(`people:lifecycle smoke check failed: ${error.message}`);
  } finally {
    await cleanupDraft(slug).catch(() => {});
    await cleanupDraft(copiedSlug).catch(() => {});
    await cleanupDraft(demotedSlug).catch(() => {});
    if (promoted) {
      await demotePublished(slug, { slug: demotedSlug, overwrite: true }).catch(() => {});
      await cleanupDraft(demotedSlug).catch(() => {});
    }
  }
};

for (const file of publicFiles) {
  const source = await readFile(file, "utf8");
  const frontmatter = frontmatterOf(source);
  const label = path.relative(root, file);

  if (!hasBlock(frontmatter, "references")) {
    findings.push(`${label}: missing references`);
  }

  if (!/^\s+alt:\s*\S/m.test(frontmatter)) {
    findings.push(`${label}: missing image alt text`);
  }

  if (!hasValue(frontmatter, "summary")) {
    findings.push(`${label}: missing summary`);
  }

  if (!hasValue(frontmatter, "birthYear") && !hasValue(frontmatter, "lifespan")) {
    findings.push(`${label}: missing date metadata`);
  }

  if (!hasValue(frontmatter, "dateStatus")) {
    findings.push(`${label}: date metadata has no reviewed/approximate/needs-source status`);
  }

  if (!hasValue(frontmatter, "sourceCoverageStatus")) {
    findings.push(`${label}: source coverage has no reviewed/approximate/needs-source status`);
  }

  const placesBlock = blockOf(frontmatter, "places");
  const coordinateCount = countMatches(placesBlock, /^\s+latitude:\s/gm);
  if (coordinateCount > 0) {
    const placeStatusCount = countMatches(placesBlock, /^\s+status:\s*(reviewed|approximate|needs-source)$/gm);
    const placeSourceCount = countMatches(placesBlock, /^\s+source:\s*["']?https?:\/\//gm);

    if (placeStatusCount < coordinateCount) {
      findings.push(`${label}: mapped coordinate metadata has no reliability status`);
    }

    if (placeSourceCount < coordinateCount) {
      findings.push(`${label}: mapped coordinate metadata has no direct source URL`);
    }
  }

  const contextBlock = blockOf(frontmatter, "contextEvents");
  const contextEventCount = countMatches(contextBlock, /^\s+-\s+label:/gm);
  if (contextEventCount > 0) {
    const contextSourceCount = countMatches(contextBlock, /^\s+source:\s*["']?https?:\/\//gm);
    const contextStatusCount = countMatches(contextBlock, /^\s+status:\s*(reviewed|approximate|needs-source)$/gm);
    const contextItems = parseListItems(contextBlock);
    const layeredContextItems = contextItems.filter((item) => item.layer);
    const worldContextItems = contextItems.filter((item) => item.layer === "world");
    const layeredWithoutStatusOrSource = layeredContextItems.filter((item) => !item.status || !item.source);
    const worldWithoutThreadOrNote = worldContextItems.filter((item) => !item.thread && !item.note);

    if (contextSourceCount < contextEventCount) {
      findings.push(`${label}: context event metadata has no direct source URL`);
    }

    if (contextStatusCount < contextEventCount) {
      findings.push(`${label}: context timeline metadata has no reliability status`);
    }

    if (layeredWithoutStatusOrSource.length > 0) {
      findings.push(`${label}: layered context events need both status and source metadata`);
    }

    if (worldWithoutThreadOrNote.length > 0) {
      findings.push(`${label}: world context events need a thread or note`);
    }
  }

  const storySeedBlock = blockOf(frontmatter, "storySeeds");
  const storySeedCount = countMatches(storySeedBlock, /^\s+-\s+title:/gm);
  if (storySeedCount > 0) {
    const storySeedSourceCount = countMatches(storySeedBlock, /^\s+source:\s*["']?https?:\/\//gm);
    const storySeedStatusCount = countMatches(storySeedBlock, /^\s+status:\s*(reviewed|approximate|needs-source)$/gm);
    const storySeedPromptCount = countMatches(storySeedBlock, /^\s+prompt:\s*\S/gm);

    if (storySeedSourceCount < storySeedCount) {
      findings.push(`${label}: story seed metadata has no direct source URL`);
    }

    if (storySeedStatusCount < storySeedCount) {
      findings.push(`${label}: story seed metadata has no reliability status`);
    }

    if (storySeedPromptCount < storySeedCount) {
      findings.push(`${label}: story seed metadata has no prompt`);
    }
  }

  const referencesBlock = blockOf(frontmatter, "references");
  const referenceCount = countMatches(referencesBlock, /^\s+-\s+title:/gm);
  const typedReferenceCount = countMatches(referencesBlock, /^\s+type:\s*(primary|archive|museum|book|article|reference|authority)$/gm);

  if (/^sourceStrength:\s*strong$/m.test(frontmatter) && referenceCount < 2) {
    findings.push(`${label}: strong source strength needs at least two references`);
  }

  if (referenceCount > 0 && typedReferenceCount === 0) {
    warnings.push(`${label}: references have no source type metadata; fallback inference will be used`);
  }

  if (referenceCount < 2) {
    warnings.push(`${label}: weak source coverage, fewer than two references; marked ${hasValue(frontmatter, "sourceCoverageStatus") ? "with status" : "without status"}`);
  }

  const unsourcedReviewedFacts =
    countReviewedItemsWithoutSource(placesBlock) +
    countReviewedItemsWithoutSource(contextBlock) +
    countReviewedItemsWithoutSource(storySeedBlock) +
    countReviewedItemsWithoutSource(blockOf(frontmatter, "importantWorks"));

  if (unsourcedReviewedFacts > 0) {
    findings.push(`${label}: reviewed fact metadata has no direct source URL`);
  }
}

for (const file of draftFiles) {
  const source = await readFile(file, "utf8");
  const frontmatter = frontmatterOf(source);
  const label = path.relative(root, file);

  if (!hasValue(frontmatter, "draft") || !/^draft:\s*true$/m.test(frontmatter)) {
    findings.push(`${label}: imported draft must keep draft: true`);
  }

  if (!/^reviewed:\s*false$/m.test(frontmatter)) {
    findings.push(`${label}: imported draft is not marked as unreviewed`);
  }

  warnings.push(`${label}: saved local draft is unreviewed and excluded from published content`);
}

runEditorHealthCheck();
await runStructuredEditorChecks();
await runLifecycleSmokeCheck();
await runImportSmokeCheck();

if (findings.length > 0) {
  console.log("Content QA findings:");
  findings.forEach((finding) => console.log(`- ${finding}`));
  process.exitCode = 1;
} else {
  console.log("Content QA passed.");
}

if (warnings.length > 0) {
  console.log("Content QA warnings:");
  warnings.forEach((warning) => console.log(`- ${warning}`));
}
