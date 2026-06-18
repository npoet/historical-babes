import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, "..", "..");

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

export const allowedSourceTypes = new Set([
  "primary",
  "archive",
  "museum",
  "book",
  "article",
  "reference",
  "authority",
]);

export const allowedSourceSupports = new Set([
  "dates",
  "place",
  "work",
  "context event",
  "image",
  "quote",
  "background",
]);

export const allowedConnectionReasons = new Set([
  "shared theme",
  "similar work",
  "same era",
  "connected place",
  "shared context event",
  "historical thread",
]);

export const statusValues = new Set(["reviewed", "approximate", "needs-source"]);
