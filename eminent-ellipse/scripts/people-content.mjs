export { defaultProfileImage, draftsDir, figuresDir, projectRoot } from "./people-content/paths.mjs";
export { slugify } from "./people-content/utils.mjs";
export { frontmatterOf, parseFrontmatterSummary } from "./people-content/frontmatter.mjs";
export {
  normalizeConnections,
  normalizeContextEvents,
  normalizeOpenQuestions,
  normalizeReferences,
} from "./people-content/normalize.mjs";
export { buildDraftSource } from "./people-content/serialization.mjs";
export {
  cleanupDraft,
  copyProfileToDraft,
  createDraft,
  deleteProfile,
  demotePublished,
  listProfiles,
  promoteDraft,
  readProfile,
  saveDraftSource,
  validateDraftInput,
} from "./people-content/profiles.mjs";
export { proposeEnrichment } from "./people-content/enrichment.mjs";
