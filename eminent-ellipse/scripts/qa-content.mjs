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

const findings = [];
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
