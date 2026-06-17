import { allowedSourceTypes, statusValues } from "./paths.mjs";
import { cleanObject, isPresent, normalizeList, slugify, yamlNumber } from "./utils.mjs";

export const normalizeReferences = (references = []) =>
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

export const normalizeConnections = (connections = []) =>
  connections
    .map((connection) => ({
      id: slugify(connection.id ?? ""),
      reasons: normalizeList(connection.reasons),
      note: connection.note?.trim(),
    }))
    .filter((connection) => connection.id);

export const normalizeContextEvents = (events = []) =>
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

export const normalizeOpenQuestions = (questions) => normalizeList(questions);

