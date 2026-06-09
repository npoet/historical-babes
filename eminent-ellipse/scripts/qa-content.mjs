import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = new URL("..", import.meta.url).pathname;
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

const findings = [];
const warnings = [];
const publicFiles = await readMdxFiles(figuresDir);
const draftFiles = await readMdxFiles(draftsDir);

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

    if (contextSourceCount < contextEventCount) {
      findings.push(`${label}: context event metadata has no direct source URL`);
    }

    if (contextStatusCount < contextEventCount) {
      findings.push(`${label}: context timeline metadata has no reliability status`);
    }
  }

  const referenceCount = (frontmatter.match(/^\s*-\s+title:/gm) ?? []).length;
  if (referenceCount < 2) {
    warnings.push(`${label}: weak source coverage, fewer than two references; marked ${hasValue(frontmatter, "sourceCoverageStatus") ? "with status" : "without status"}`);
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

  findings.push(`${label}: unreviewed imported draft`);
}

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
