import { readFile } from "node:fs/promises";
import {
  cleanupDraft,
  copyProfileToDraft,
  createDraft,
  deleteProfile,
  demotePublished,
  listProfiles,
  promoteDraft,
  proposeEnrichment,
  readProfile,
  saveDraftSource,
  validateDraftInput,
} from "./people-content.mjs";

const [command, ...args] = process.argv.slice(2);

const usage = () => {
  console.log(
    [
      "Usage: npm run people -- <command> [options]",
      "",
      "Commands:",
      "  list",
      "  create --name \"Name\" [--summary \"...\"] [--occupation \"...\"] [--tags \"a,b\"]",
      "  edit <published-id> [--slug draft-id] [--overwrite]",
      "  promote <draft-id> [--slug published-id] [--overwrite] [--delete-draft] [--force]",
      "  demote <published-id> [--slug draft-id] [--overwrite] [--keep-published]",
      "  cleanup-draft <draft-id> --yes",
      "  delete <published|draft> <id> --yes",
      "  show <published|draft> <id>",
      "  save <draft-id> --frontmatter path --body path",
      "  validate --input path/to/draft.json",
      "  enrich --input path/to/proposal.json",
      "",
      "Draft JSON accepts name, summary, dates, image/imageSrc/imageAlt, tags, themes,",
      "references, contextEvents, relatedConnections, worldContextLinks, and openQuestions.",
    ].join("\n"),
  );
};

const readOptions = (values) => {
  const options = { _: [] };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (!value.startsWith("--")) {
      options._.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
};

const options = readOptions(args);

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

try {
  if (!command || command === "help" || command === "--help") {
    usage();
    process.exit(command ? 0 : 1);
  }

  if (command === "list") {
    const profiles = await listProfiles();
    profiles.forEach((profile) => {
      console.log(`${profile.kind.padEnd(9)} ${profile.id.padEnd(32)} ${profile.name}`);
    });
  } else if (command === "create") {
    const input = {
      name: options.name,
      slug: options.slug,
      summary: options.summary,
      occupation: options.occupation,
      occupations: options.occupations,
      tags: options.tags,
      themes: options.themes,
      lifespan: options.lifespan,
      birthYear: options.birthYear,
      deathYear: options.deathYear,
      nationality: options.nationality,
      nationalities: options.nationalities,
      era: options.era,
      sourceCredit: options.sourceCredit,
      originalInstagramUrl: options.originalInstagramUrl,
      imageSrc: options.imageSrc,
      imageAlt: options.imageAlt,
      openQuestions: options.openQuestions,
      overwrite: Boolean(options.overwrite),
    };
    const result = await createDraft(input);
    console.log(`Created draft ${result.id} at ${result.file}`);
  } else if (command === "edit") {
    const id = options._[0];
    if (!id) throw new Error("edit requires a published profile id");
    const result = await copyProfileToDraft(id, {
      slug: options.slug,
      overwrite: Boolean(options.overwrite),
    });
    console.log(`Created editable draft copy ${result.id} at ${result.file}`);
  } else if (command === "promote") {
    const id = options._[0];
    if (!id) throw new Error("promote requires a draft profile id");
    const result = await promoteDraft(id, {
      slug: options.slug,
      overwrite: Boolean(options.overwrite),
      deleteDraft: Boolean(options["delete-draft"]),
      force: Boolean(options.force),
    });
    console.log(`Promoted draft ${id} to published profile ${result.id} at ${result.file}`);
  } else if (command === "demote") {
    const id = options._[0];
    if (!id) throw new Error("demote requires a published profile id");
    const result = await demotePublished(id, {
      slug: options.slug,
      overwrite: Boolean(options.overwrite),
      keepPublished: Boolean(options["keep-published"]),
    });
    console.log(`Moved published profile ${id} to draft ${result.id} at ${result.file}`);
  } else if (command === "cleanup-draft") {
    const id = options._[0];
    if (!options.yes) throw new Error("cleanup-draft requires --yes");
    if (!id) throw new Error("cleanup-draft requires a draft profile id");
    const result = await cleanupDraft(id);
    console.log(`Cleaned up draft profile ${result.id}`);
  } else if (command === "delete") {
    const [kind, id] = options._;
    if (!options.yes) throw new Error("delete requires --yes");
    if (!["published", "draft"].includes(kind) || !id) {
      throw new Error("delete requires kind published|draft and an id");
    }
    const result = await deleteProfile(kind, id);
    console.log(`Deleted ${result.kind} profile ${result.id}`);
  } else if (command === "show") {
    const [kind, id] = options._;
    if (!["published", "draft"].includes(kind) || !id) {
      throw new Error("show requires kind published|draft and an id");
    }
    const profile = await readProfile(kind, id);
    console.log(profile.source);
  } else if (command === "save") {
    const id = options._[0];
    if (!id || !options.frontmatter || !options.body) {
      throw new Error("save requires a draft id plus --frontmatter and --body files");
    }
    const frontmatter = await readFile(options.frontmatter, "utf8");
    const body = await readFile(options.body, "utf8");
    const result = await saveDraftSource(id, frontmatter, body);
    console.log(`Saved draft ${result.id} at ${result.file}`);
  } else if (command === "validate") {
    const input = options.input ? await readJson(options.input) : {};
    const result = validateDraftInput(input);
    if (result.findings.length) {
      console.log("Draft validation notes:");
      result.findings.forEach((finding) => console.log(`- ${finding}`));
    } else {
      console.log("Draft input is ready to write.");
    }
  } else if (command === "enrich") {
    const input = options.input ? await readJson(options.input) : {};
    console.log(JSON.stringify(proposeEnrichment(input), null, 2));
  } else {
    usage();
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
