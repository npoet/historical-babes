import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const inputFlag = process.argv.findIndex((arg) => arg === "--input");
const inputPath = inputFlag >= 0 ? process.argv[inputFlag + 1] : undefined;

if (!inputPath) {
  console.error(
    [
      "Usage: npm run import:drafts -- --input path/to/source",
      "",
      "Supported sources:",
      "- Instagram JSON export arrays or objects with an items array",
      "- Plain text or Markdown notes, split into drafts by headings or blank-line sections",
      "- Screenshot/image files, converted into draft placeholders for human transcription",
    ].join("\n"),
  );
  process.exit(1);
}

const outputDir = new URL("../src/content/drafts/figures/", import.meta.url);
await mkdir(outputDir, { recursive: true });

const slugify = (value) =>
  value
    .toString()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-");

const yamlString = (value) => JSON.stringify(value ?? "");

const getExtension = (filePath) => path.extname(filePath).toLowerCase();

const isImageSource = (filePath) =>
  [".avif", ".gif", ".heic", ".jpeg", ".jpg", ".png", ".webp"].includes(
    getExtension(filePath),
  );

const isTextSource = (filePath) =>
  [".md", ".markdown", ".txt"].includes(getExtension(filePath));

const cleanTitleMarker = (value) =>
  value
    .replace(/^#{1,6}\s+/, "")
    .replace(/^name\s*:\s*/i, "")
    .trim();

const firstUsefulLine = (value) =>
  value
    .split(/\r?\n/)
    .map((line) => cleanTitleMarker(line))
    .find((line) => line && !line.startsWith("-"));

const normalizeRecord = (record, index, defaults = {}) => {
  const rawText = record.rawText ?? record.text ?? record.body ?? "";
  const name =
    record.name ??
    record.title ??
    (rawText ? firstUsefulLine(rawText) : undefined) ??
    defaults.name ??
    `Imported Draft ${index + 1}`;
  const summary =
    record.summary ??
    record.caption ??
    record.notes ??
    rawText ??
    defaults.summary ??
    "";
  const sourceUrl = record.originalInstagramUrl ?? record.url;
  const sourceCredit =
    record.sourceCredit ??
    defaults.sourceCredit ??
    "Imported draft for human review";
  const tags = Array.isArray(record.tags) ? record.tags : defaults.tags ?? [];

  return {
    name,
    summary,
    sourceUrl,
    sourceCredit,
    tags,
    sourcePath: record.sourcePath ?? defaults.sourcePath,
    sourceType: record.sourceType ?? defaults.sourceType,
  };
};

const parseJsonRecords = (raw) => {
  const parsed = JSON.parse(raw);
  const records = Array.isArray(parsed) ? parsed : parsed.items;

  if (!Array.isArray(records)) {
    throw new Error("Expected a JSON array or an object with an items array.");
  }

  return records;
};

const parseTextRecords = (raw, sourcePath) => {
  const normalized = raw.trim();

  if (!normalized) {
    throw new Error("Text source is empty.");
  }

  const hasHeadings = /^#{1,3}\s+/m.test(normalized);
  const headingSections = normalized
    .split(/\n(?=#{1,3}\s+)/)
    .map((section) => section.trim())
    .filter(Boolean);
  const sections =
    hasHeadings
      ? headingSections
      : normalized.split(/\n\s*\n(?=\S)/).map((section) => section.trim()).filter(Boolean);

  return sections.map((section, index) => ({
    title: firstUsefulLine(section) ?? `Raw Notes Draft ${index + 1}`,
    rawText: section,
    sourcePath,
    sourceType: "raw notes",
  }));
};

const recordsFromInput = async (sourcePath) => {
  const details = await stat(sourcePath);

  if (!details.isFile()) {
    throw new Error("Input must be a file.");
  }

  if (isImageSource(sourcePath)) {
    return [
      {
        title: path.basename(sourcePath, path.extname(sourcePath)),
        rawText: `Screenshot source: ${path.basename(sourcePath)}\n\nTranscribe caption text, visible names, dates, places, and references before promotion.`,
        sourcePath,
        sourceType: "screenshot",
        sourceCredit: "Screenshot imported as draft source material for human review",
      },
    ];
  }

  const raw = await readFile(sourcePath, "utf8");

  if (isTextSource(sourcePath)) {
    return parseTextRecords(raw, sourcePath);
  }

  return parseJsonRecords(raw).map((record) => ({
    ...record,
    sourcePath,
    sourceType: "Instagram JSON export",
  }));
};

const records = await recordsFromInput(inputPath);

for (const [index, rawRecord] of records.entries()) {
  const record = normalizeRecord(rawRecord, index);
  const slug = slugify(record.name) || `imported-draft-${index + 1}`;
  const summary = record.summary;
  const sourceNotes = [
    record.sourceType ? `Source type: ${record.sourceType}` : undefined,
    record.sourcePath ? `Source path: ${record.sourcePath}` : undefined,
  ].filter(Boolean);

  const frontmatter = [
    "---",
    `name: ${yamlString(record.name)}`,
    "draft: true",
    "reviewed: false",
    summary ? `summary: ${yamlString(summary.slice(0, 240))}` : undefined,
    `sourceCredit: ${yamlString(record.sourceCredit)}`,
    record.sourceUrl ? `originalInstagramUrl: ${yamlString(record.sourceUrl)}` : undefined,
    "image:",
    "  src: /images/historical-babes.gif",
    `  alt: ${yamlString(`Draft placeholder image for ${record.name}`)}`,
    record.tags.length ? "tags:" : undefined,
    ...record.tags.map((tag) => `  - ${yamlString(tag)}`),
    "---",
  ].filter(Boolean);

  const body = [
    summary || "Imported draft awaiting human review.",
    "",
    ...sourceNotes,
    sourceNotes.length ? "" : undefined,
    "Review checklist:",
    "- Confirm name, dates, places, and occupation metadata.",
    "- Transcribe screenshot/raw note context into structured fields where useful.",
    "- Replace placeholder image and alt text.",
    "- Add references before promoting to the public figures collection.",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  await writeFile(
    path.join(outputDir.pathname, `${slug}.mdx`),
    `${frontmatter.join("\n")}\n\n${body}\n`,
    "utf8",
  );
}

console.log(`Created ${records.length} draft file(s) in src/content/drafts/figures.`);
