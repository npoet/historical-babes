import http from "node:http";
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  cleanupDraft,
  copyProfileToDraft,
  createDraft,
  deleteProfile,
  demotePublished,
  listProfiles,
  projectRoot,
  promoteDraft,
  proposeEnrichment,
  readProfile,
  saveDraftSource,
  slugify,
  validateDraftInput,
} from "./people-content.mjs";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

const host = "127.0.0.1";
const port = Number.parseInt(process.env.PEOPLE_EDITOR_PORT || "4322", 10);
const uploadDir = path.join(projectRoot, "public/images/editor-uploads");

const send = (response, status, body, headers = {}) => {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  response.writeHead(status, {
    "content-type": typeof body === "string" ? "text/html; charset=utf-8" : "application/json",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(payload);
};

const readJsonBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

export const editorPage = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Historical Babes People Editor</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f7f4ef; color: #24211d; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 24px; border-bottom: 1px solid #d7cec0; background: #fffaf2; }
    h1 { margin: 0; font-size: 20px; }
    main { display: grid; grid-template-columns: 320px minmax(0, 1fr); min-height: calc(100vh - 65px); }
    aside { border-right: 1px solid #d7cec0; padding: 16px; overflow: auto; background: #fbf7ef; }
    section { padding: 18px; overflow: auto; }
    button, input, select, textarea { font: inherit; }
    button { border: 1px solid #6e5f4a; background: #2f5f57; color: white; border-radius: 6px; padding: 8px 11px; cursor: pointer; }
    button.secondary { background: #fffaf2; color: #2f332e; }
    button.danger { background: #884437; }
    button:disabled { opacity: .55; cursor: wait; }
    input, select, textarea { box-sizing: border-box; width: 100%; border: 1px solid #b8ae9e; border-radius: 6px; padding: 8px; background: white; color: #24211d; }
    textarea { min-height: 110px; resize: vertical; line-height: 1.45; }
    textarea.mono, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    label { display: grid; gap: 5px; font-size: 13px; font-weight: 650; color: #423b32; }
    fieldset { border: 1px solid #d7cec0; border-radius: 8px; padding: 14px; background: #fffaf2; }
    legend { padding: 0 6px; font-weight: 800; color: #453b2f; }
    .stack { display: grid; gap: 12px; }
    .row { display: flex; gap: 8px; align-items: end; }
    .row > * { flex: 1; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; }
    .list { display: grid; gap: 8px; }
    .profile { text-align: left; background: white; color: #24211d; border-color: #d7cec0; }
    .profile small { display: block; color: #675d50; margin-top: 2px; }
    .badge { display: inline-flex; align-items: center; border: 1px solid #a89a87; border-radius: 999px; padding: 2px 8px; font-size: 12px; background: #fff; color: #3c342b; }
    .editor { display: grid; gap: 14px; max-width: 1180px; }
    .two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .four { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .notice { border: 1px solid #b8ae9e; border-radius: 6px; padding: 10px; background: #fffaf2; white-space: pre-wrap; }
    .repeat-list { display: grid; gap: 10px; }
    .repeat-item { display: grid; gap: 10px; border: 1px solid #d7cec0; border-radius: 8px; padding: 10px; background: white; }
    .token-field { display: grid; gap: 8px; }
    .token-list { display: flex; flex-wrap: wrap; gap: 6px; min-height: 38px; border: 1px solid #b8ae9e; border-radius: 6px; padding: 6px; background: white; }
    .token { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #a89a87; border-radius: 999px; padding: 3px 7px; background: #f7f4ef; color: #24211d; font-size: 12px; }
    .token button { border: 0; background: transparent; color: inherit; padding: 0 2px; line-height: 1; }
    .readiness ul { margin: 8px 0 0; padding-left: 20px; }
    pre { margin: 0; overflow: auto; border: 1px solid #b8ae9e; border-radius: 6px; padding: 10px; background: #fffaf2; max-height: 260px; }
    details > summary { cursor: pointer; font-weight: 800; margin-bottom: 8px; }
    @media (max-width: 920px) {
      main { grid-template-columns: 1fr; }
      aside { border-right: 0; border-bottom: 1px solid #d7cec0; }
      .two, .three, .four { grid-template-columns: 1fr; }
      .row { flex-direction: column; align-items: stretch; }
    }
    @media (prefers-color-scheme: dark) {
      body { background: #1f211e; color: #eee7dc; }
      header, aside, fieldset, input, select, textarea, .profile, .notice, pre, .repeat-item, .token-list { background: #292b27; color: #eee7dc; border-color: #555044; }
      button.secondary { background: #292b27; color: #eee7dc; }
      label, legend, .profile small { color: #d5cab8; }
      .badge, .token { background: #33352f; color: #eee7dc; border-color: #686052; }
    }
  </style>
</head>
<body>
  <header>
    <h1>People Editor</h1>
    <span class="badge">localhost only</span>
  </header>
  <main>
    <aside class="stack">
      <div class="toolbar">
        <button id="refresh" class="secondary">Refresh</button>
        <button id="newDraft">New Draft</button>
      </div>
      <label>Filter <input id="filter" autocomplete="off" placeholder="Name or slug"></label>
      <div id="profiles" class="list"></div>
    </aside>
    <section>
      <div class="editor">
        <div class="toolbar">
          <button id="save">Save Draft</button>
          <button id="copy" class="secondary">Copy Published To Draft</button>
          <button id="promote" class="secondary">Promote Draft</button>
          <button id="demote" class="secondary">Move Published To Draft</button>
          <button id="enrich" class="secondary">Review Enrichment</button>
          <button id="cleanupDraft" class="secondary">Clean Up Draft</button>
          <button id="delete" class="danger">Delete Loaded</button>
        </div>
        <div id="status" class="notice">Load a profile or create a new draft.</div>
        <div id="readiness" class="notice readiness">Review readiness will appear after loading or editing a profile.</div>

        <fieldset class="stack">
          <legend>Identity</legend>
          <div class="two">
            <label>Slug <input id="slug" autocomplete="off"></label>
            <label>Loaded Kind <input id="kind" disabled></label>
          </div>
          <div class="two">
            <label>Name <input id="name" autocomplete="off"></label>
            <label>Lifespan <input id="lifespan" placeholder="1815-1852"></label>
          </div>
          <label>Summary <textarea id="summary"></textarea></label>
          <div class="three">
            <label>Birth Year <input id="birthYear" type="number" step="1"></label>
            <label>Death Year <input id="deathYear" type="number" step="1"></label>
            <label>Date Status
              <select id="dateStatus">
                <option value="needs-source">needs-source</option>
                <option value="approximate">approximate</option>
                <option value="reviewed">reviewed</option>
              </select>
            </label>
          </div>
          <div class="three">
            <label>Nationality <input id="nationality"></label>
            <label>Era <input id="era" placeholder="19th century"></label>
            <label>Original Instagram URL <input id="originalInstagramUrl" type="url"></label>
          </div>
          <div class="three">
            <label>Jobs / Fields
              <span class="token-field">
                <span id="occupations" class="token-list" data-token-list></span>
                <span class="row"><input data-token-input="occupations" list="jobSuggestions" placeholder="Add job or field"><button type="button" class="secondary" data-token-add="occupations">Add</button></span>
              </span>
            </label>
            <label>Themes
              <span class="token-field">
                <span id="themes" class="token-list" data-token-list></span>
                <span class="row"><input data-token-input="themes" list="themeSuggestions" placeholder="Add theme"><button type="button" class="secondary" data-token-add="themes">Add</button></span>
              </span>
            </label>
            <label>Tags
              <span class="token-field">
                <span id="tags" class="token-list" data-token-list></span>
                <span class="row"><input data-token-input="tags" list="tagSuggestions" placeholder="Add tag"><button type="button" class="secondary" data-token-add="tags">Add</button></span>
              </span>
            </label>
          </div>
          <div class="two">
            <label>Source Credit <input id="sourceCredit"></label>
          </div>
          <div class="two">
            <label>Source Coverage
              <select id="sourceCoverageStatus">
                <option value="needs-source">needs-source</option>
                <option value="approximate">approximate</option>
                <option value="reviewed">reviewed</option>
              </select>
            </label>
            <label>Source Strength
              <select id="sourceStrength">
                <option value="needs-review">needs-review</option>
                <option value="partial">partial</option>
                <option value="strong">strong</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset class="stack">
          <legend>Picture</legend>
          <div class="two">
            <label>Image Path <input id="imageSrc" placeholder="/images/historical-babes.gif"></label>
            <label>Image Alt Text <input id="imageAlt"></label>
          </div>
          <div class="row">
            <label>Upload Local Image <input id="imageUpload" type="file" accept="image/*"></label>
            <button id="uploadImage" class="secondary">Upload To Site Images</button>
          </div>
        </fieldset>

        <fieldset class="stack">
          <legend>Places</legend>
          <div id="places" class="repeat-list"></div>
          <button id="addPlace" class="secondary">Add Place</button>
        </fieldset>

        <fieldset class="stack">
          <legend>Timeline Points</legend>
          <div id="events" class="repeat-list"></div>
          <button id="addEvent" class="secondary">Add Point</button>
        </fieldset>

        <fieldset class="stack">
          <legend>Important Works</legend>
          <div id="works" class="repeat-list"></div>
          <button id="addWork" class="secondary">Add Work</button>
        </fieldset>

        <fieldset class="stack">
          <legend>Story Prompts</legend>
          <div id="storySeeds" class="repeat-list"></div>
          <button id="addStorySeed" class="secondary">Add Story Prompt</button>
        </fieldset>

        <fieldset class="stack">
          <legend>References</legend>
          <div id="references" class="repeat-list"></div>
          <button id="addReference" class="secondary">Add Reference</button>
        </fieldset>

        <fieldset class="stack">
          <legend>Related People</legend>
          <div id="related" class="repeat-list"></div>
          <button id="addRelated" class="secondary">Add Related Person</button>
        </fieldset>

        <fieldset class="stack">
          <legend>Profile Text</legend>
          <label>Main Body <textarea id="body" spellcheck="true"></textarea></label>
          <label>Open Questions
            <span class="token-field">
              <span id="openQuestions" class="token-list" data-token-list></span>
              <span class="row"><input data-token-input="openQuestions" placeholder="Add one review question"><button type="button" class="secondary" data-token-add="openQuestions">Add</button></span>
            </span>
          </label>
        </fieldset>

        <details>
          <summary>Advanced generated frontmatter</summary>
          <textarea id="frontmatter" class="mono" spellcheck="false"></textarea>
        </details>

        <label>Enrichment Proposal <pre id="proposal">No proposal yet.</pre></label>
        <datalist id="jobSuggestions"></datalist>
        <datalist id="tagSuggestions"></datalist>
        <datalist id="themeSuggestions"></datalist>
        <datalist id="threadSuggestions"></datalist>
        <datalist id="personSuggestions"></datalist>
        <datalist id="supportSuggestions"></datalist>
        <datalist id="reasonSuggestions"></datalist>
      </div>
    </section>
  </main>
  <script>
    const state = { profiles: [], loaded: null };
    const allowed = {
      placeTypes: ["birth", "death", "lived", "worked", "studied", "active", "event"],
      statuses: ["needs-source", "approximate", "reviewed"],
      layers: ["personal", "impact", "world"],
      importance: ["supporting", "major"],
      sourceTypes: ["primary", "archive", "museum", "book", "article", "reference", "authority"],
      supports: ["dates", "place", "work", "context event", "image", "quote", "background"],
      reasons: ["shared theme", "similar work", "same era", "connected place", "shared context event", "historical thread"],
    };
    const ids = ["profiles", "filter", "status", "readiness", "slug", "kind", "name", "summary", "lifespan", "birthYear", "deathYear", "dateStatus", "nationality", "era", "originalInstagramUrl", "occupations", "themes", "tags", "sourceCredit", "sourceCoverageStatus", "sourceStrength", "imageSrc", "imageAlt", "imageUpload", "places", "events", "works", "storySeeds", "references", "related", "body", "openQuestions", "frontmatter", "proposal", "refresh", "newDraft", "save", "copy", "promote", "demote", "enrich", "cleanupDraft", "delete", "addPlace", "addEvent", "addWork", "addStorySeed", "addReference", "addRelated", "uploadImage", "jobSuggestions", "tagSuggestions", "themeSuggestions", "threadSuggestions", "personSuggestions", "supportSuggestions", "reasonSuggestions"];
    const els = Object.fromEntries(ids.map((id) => [id, document.querySelector("#" + id)]));

    const api = async (url, options) => {
      const response = await fetch(url, {
        ...options,
        headers: { "content-type": "application/json", ...(options?.headers || {}) },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");
      return data;
    };
    const setStatus = (message) => { els.status.textContent = message; };
    const csv = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);
    const lines = (value) => value.split("\n").map((item) => item.trim()).filter(Boolean);
    const quote = (value) => JSON.stringify(value || "");
    const numberOrBlank = (value) => value === "" || value === undefined ? "" : Number.parseInt(value, 10);
    const setValue = (id, value) => { els[id].value = value ?? ""; };
    const getValue = (id) => els[id].value.trim();

    const optionHtml = (values, selected) => values.map((value) => "<option value=\"" + value + "\"" + (value === selected ? " selected" : "") + ">" + value + "</option>").join("");
    const removeButton = () => '<button type="button" class="secondary" data-remove>Remove</button>';
    const datalistOptions = (id, values) => { els[id].innerHTML = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b)).map((value) => '<option value="' + escapeHtml(value) + '"></option>').join(""); };
    const tokenValues = (container) => Array.from(container.querySelectorAll("[data-token-value]")).map((token) => token.dataset.tokenValue).filter(Boolean);
    const renderToken = (container, value) => {
      const normalized = value.trim();
      if (!normalized || tokenValues(container).includes(normalized)) return;
      const token = document.createElement("span");
      token.className = "token";
      token.dataset.tokenValue = normalized;
      token.innerHTML = '<span>' + escapeHtml(normalized) + '</span><button type="button" title="Remove">x</button>';
      token.querySelector("button").addEventListener("click", () => { token.remove(); buildFrontmatter(); });
      container.append(token);
    };
    const addToken = (id) => {
      const input = document.querySelector('[data-token-input="' + id + '"]');
      if (!input) return;
      renderToken(els[id], input.value);
      input.value = "";
      buildFrontmatter();
    };
    const setTokens = (id, values = []) => {
      els[id].innerHTML = "";
      values.filter(Boolean).forEach((value) => renderToken(els[id], value.toString()));
    };
    const readTokens = (id) => tokenValues(els[id]);
    const tokenControlHtml = (key, values, list, placeholder) => [
      '<span class="token-field">',
      '<span class="token-list" data-token-list data-key="' + key + '"></span>',
      '<span class="row"><input data-token-row-input="' + key + '" list="' + list + '" placeholder="' + placeholder + '"><button type="button" class="secondary" data-token-row-add="' + key + '">Add</button></span>',
      '</span>',
    ].join("");
    const initRowTokenControl = (item, key, values = []) => {
      const container = item.querySelector('[data-token-list][data-key="' + key + '"]');
      const input = item.querySelector('[data-token-row-input="' + key + '"]');
      const button = item.querySelector('[data-token-row-add="' + key + '"]');
      const add = () => {
        renderToken(container, input.value);
        input.value = "";
        buildFrontmatter();
      };
      values.filter(Boolean).forEach((value) => renderToken(container, value.toString()));
      button.addEventListener("click", add);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          add();
        }
      });
    };

    const rowPlace = (data = {}) => {
      const item = document.createElement("div");
      item.className = "repeat-item";
      item.dataset.kind = "place";
      item.innerHTML = [
        '<div class="four">',
        '<label>Type<select data-key="type">' + optionHtml(allowed.placeTypes, data.type || "active") + '</select></label>',
        '<label>Name / City<input data-key="name" value="' + escapeHtml(data.name || "") + '"></label>',
        '<label>Latitude<input data-key="latitude" type="number" step="any" value="' + escapeHtml(data.latitude || "") + '"></label>',
        '<label>Longitude<input data-key="longitude" type="number" step="any" value="' + escapeHtml(data.longitude || "") + '"></label>',
        '</div><div class="four">',
        '<label>Start Year<input data-key="startYear" type="number" step="1" value="' + escapeHtml(data.startYear || "") + '"></label>',
        '<label>End Year<input data-key="endYear" type="number" step="1" value="' + escapeHtml(data.endYear || "") + '"></label>',
        '<label>Status<select data-key="status">' + optionHtml(allowed.statuses, data.status || "needs-source") + '</select></label>',
        '<label>Source URL<input data-key="source" type="url" value="' + escapeHtml(data.source || "") + '"></label>',
        '</div>',
        '<label>Note<textarea data-key="note">' + escapeHtml(data.note || "") + '</textarea></label>',
        '<div class="toolbar"><button type="button" class="secondary" data-map-search>Find Coords</button>' + removeButton() + '</div>',
      ].join("");
      item.querySelector("[data-map-search]").addEventListener("click", () => {
        const query = item.querySelector('[data-key="name"]').value.trim();
        if (query) window.open("https://www.openstreetmap.org/search?query=" + encodeURIComponent(query), "_blank");
      });
      item.querySelector("[data-remove]").addEventListener("click", () => item.remove());
      els.places.append(item);
    };

    const rowEvent = (data = {}) => {
      const item = document.createElement("div");
      item.className = "repeat-item";
      item.dataset.kind = "event";
      item.innerHTML = [
        '<div class="four">',
        '<label>Point Type<select data-key="layer">' + optionHtml(allowed.layers, data.layer || "personal") + '</select></label>',
        '<label>Importance<select data-key="importance">' + optionHtml(allowed.importance, data.importance || "supporting") + '</select></label>',
        '<label>Year<input data-key="year" type="number" step="1" value="' + escapeHtml(data.year || "") + '"></label>',
        '<label>Thread<input data-key="thread" list="threadSuggestions" value="' + escapeHtml(data.thread || "") + '"></label>',
        '</div><div class="three">',
        '<label>Label<input data-key="label" value="' + escapeHtml(data.label || "") + '"></label>',
        '<label>Place<input data-key="place" value="' + escapeHtml(data.place || "") + '"></label>',
        '<label>Status<select data-key="status">' + optionHtml(allowed.statuses, data.status || "needs-source") + '</select></label>',
        '</div><div class="three">',
        '<label>Start Year<input data-key="startYear" type="number" step="1" value="' + escapeHtml(data.startYear || "") + '"></label>',
        '<label>End Year<input data-key="endYear" type="number" step="1" value="' + escapeHtml(data.endYear || "") + '"></label>',
        '<label>Source URL<input data-key="source" type="url" value="' + escapeHtml(data.source || "") + '"></label>',
        '</div>',
        '<label>Point Body / Note<textarea data-key="note">' + escapeHtml(data.note || "") + '</textarea></label>',
        '<div class="toolbar">' + removeButton() + '</div>',
      ].join("");
      item.querySelector("[data-remove]").addEventListener("click", () => item.remove());
      els.events.append(item);
    };

    const rowWork = (data = {}) => {
      const item = document.createElement("div");
      item.className = "repeat-item";
      item.dataset.kind = "work";
      const work = typeof data === "string" ? { title: data } : data;
      item.innerHTML = [
        '<div class="four">',
        '<label>Title<input data-key="title" value="' + escapeHtml(work.title || "") + '"></label>',
        '<label>Year<input data-key="year" type="number" step="1" value="' + escapeHtml(work.year || "") + '"></label>',
        '<label>Start Year<input data-key="startYear" type="number" step="1" value="' + escapeHtml(work.startYear || "") + '"></label>',
        '<label>End Year<input data-key="endYear" type="number" step="1" value="' + escapeHtml(work.endYear || "") + '"></label>',
        '</div><div class="three">',
        '<label>Place<input data-key="place" value="' + escapeHtml(work.place || "") + '"></label>',
        '<label>Status<select data-key="status">' + optionHtml(allowed.statuses, work.status || "needs-source") + '</select></label>',
        '<label>Source URL<input data-key="source" type="url" value="' + escapeHtml(work.source || "") + '"></label>',
        '</div>',
        '<label>Note<textarea data-key="note">' + escapeHtml(work.note || "") + '</textarea></label>',
        '<div class="toolbar">' + removeButton() + '</div>',
      ].join("");
      item.querySelector("[data-remove]").addEventListener("click", () => item.remove());
      els.works.append(item);
    };

    const rowStorySeed = (data = {}) => {
      const item = document.createElement("div");
      item.className = "repeat-item";
      item.dataset.kind = "storySeed";
      item.innerHTML = [
        '<div class="four">',
        '<label>Title<input data-key="title" value="' + escapeHtml(data.title || "") + '"></label>',
        '<label>Year<input data-key="year" type="number" step="1" value="' + escapeHtml(data.year || "") + '"></label>',
        '<label>Start Year<input data-key="startYear" type="number" step="1" value="' + escapeHtml(data.startYear || "") + '"></label>',
        '<label>End Year<input data-key="endYear" type="number" step="1" value="' + escapeHtml(data.endYear || "") + '"></label>',
        '</div><div class="two">',
        '<label>Status<select data-key="status">' + optionHtml(allowed.statuses, data.status || "needs-source") + '</select></label>',
        '<label>Source URL<input data-key="source" type="url" value="' + escapeHtml(data.source || "") + '"></label>',
        '</div>',
        '<label>Prompt<textarea data-key="prompt">' + escapeHtml(data.prompt || "") + '</textarea></label>',
        '<label>Note<textarea data-key="note">' + escapeHtml(data.note || "") + '</textarea></label>',
        '<div class="toolbar">' + removeButton() + '</div>',
      ].join("");
      item.querySelector("[data-remove]").addEventListener("click", () => item.remove());
      els.storySeeds.append(item);
    };

    const rowReference = (data = {}) => {
      const item = document.createElement("div");
      item.className = "repeat-item";
      item.dataset.kind = "reference";
      item.innerHTML = [
        '<div class="three">',
        '<label>Title<input data-key="title" value="' + escapeHtml(data.title || "") + '"></label>',
        '<label>URL<input data-key="url" type="url" value="' + escapeHtml(data.url || "") + '"></label>',
        '<label>Type<select data-key="type">' + optionHtml(allowed.sourceTypes, data.type || "reference") + '</select></label>',
        '</div><div class="two">',
        '<label>Supports' + tokenControlHtml("supports", data.supports || [], "supportSuggestions", "Add support type") + '</label>',
        '<label>Status<select data-key="status">' + optionHtml(allowed.statuses, data.status || "needs-source") + '</select></label>',
        '</div>',
        '<label>Note<textarea data-key="note">' + escapeHtml(data.note || "") + '</textarea></label>',
        '<div class="toolbar">' + removeButton() + '</div>',
      ].join("");
      initRowTokenControl(item, "supports", data.supports || []);
      item.querySelector("[data-remove]").addEventListener("click", () => item.remove());
      els.references.append(item);
    };

    const rowRelated = (data = {}) => {
      const item = document.createElement("div");
      item.className = "repeat-item";
      item.dataset.kind = "related";
      item.innerHTML = [
        '<div class="two">',
        '<label>Person Slug<input data-key="id" list="personSuggestions" value="' + escapeHtml(data.id || "") + '"></label>',
        '<label>Reasons' + tokenControlHtml("reasons", data.reasons || [], "reasonSuggestions", "Add reason") + '</label>',
        '</div>',
        '<label>Connection Note<textarea data-key="note">' + escapeHtml(data.note || "") + '</textarea></label>',
        '<div class="toolbar">' + removeButton() + '</div>',
      ].join("");
      initRowTokenControl(item, "reasons", data.reasons || []);
      item.querySelector("[data-remove]").addEventListener("click", () => item.remove());
      els.related.append(item);
    };

    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    const clearRepeaters = () => { els.places.innerHTML = ""; els.events.innerHTML = ""; els.works.innerHTML = ""; els.storySeeds.innerHTML = ""; els.references.innerHTML = ""; els.related.innerHTML = ""; };
    const readRepeater = (container, numericKeys = []) => Array.from(container.querySelectorAll(".repeat-item")).map((item) => {
      const output = {};
      item.querySelectorAll("[data-key]").forEach((field) => {
        if (field.dataset.tokenList !== undefined) return;
        const key = field.dataset.key;
        const value = field.value.trim();
        if (!value) return;
        output[key] = numericKeys.includes(key) ? Number.parseFloat(value) : value;
      });
      item.querySelectorAll("[data-token-list][data-key]").forEach((container) => {
        output[container.dataset.key] = tokenValues(container);
      });
      return output;
    }).filter((item) => item.name || item.label || item.title || item.id);

    const pushList = (out, key, values) => {
      if (!values.length) return;
      out.push(key + ":");
      values.forEach((value) => out.push("  - " + quote(value)));
    };
    const pushObjectList = (out, key, values) => {
      if (!values.length) return;
      out.push(key + ":");
      values.forEach((value) => {
        const entries = Object.entries(value).filter(([, itemValue]) => itemValue !== "" && itemValue !== undefined && itemValue !== null && (!Array.isArray(itemValue) || itemValue.length));
        if (!entries.length) return;
        entries.forEach(([entryKey, itemValue], index) => {
          const prefix = index === 0 ? "  - " : "    ";
          if (Array.isArray(itemValue)) {
            out.push(prefix + entryKey + ":");
            itemValue.forEach((nested) => out.push("      - " + quote(nested)));
          } else if (typeof itemValue === "number") {
            out.push(prefix + entryKey + ": " + itemValue);
          } else if (entryKey === "url" || entryKey === "source" || entryKey === "authorityUrl") {
            out.push(prefix + entryKey + ": " + itemValue);
          } else {
            out.push(prefix + entryKey + ": " + quote(itemValue));
          }
        });
      });
    };

    const buildFrontmatter = () => {
      const out = [
        "name: " + quote(getValue("name") || "Untitled Draft"),
        "draft: true",
        "reviewed: false",
      ];
      const scalar = ["summary", "lifespan", "nationality", "era", "sourceCredit", "originalInstagramUrl"];
      scalar.forEach((key) => { const value = getValue(key); if (value) out.push(key + ": " + quote(value)); });
      ["birthYear", "deathYear"].forEach((key) => { const value = numberOrBlank(getValue(key)); if (value !== "") out.push(key + ": " + value); });
      out.push("dateStatus: " + getValue("dateStatus"));
      const occupations = readTokens("occupations");
      if (occupations.length) {
        pushList(out, "occupations", occupations);
        out.push("occupation: " + quote(occupations.join(", ")));
      }
      pushList(out, "tags", readTokens("tags"));
      pushList(out, "themes", readTokens("themes"));
      out.push("sourceCoverageStatus: " + getValue("sourceCoverageStatus"));
      out.push("sourceStrength: " + getValue("sourceStrength"));
      pushList(out, "openQuestions", readTokens("openQuestions"));
      out.push("image:");
      out.push("  src: " + (getValue("imageSrc") || "/images/historical-babes.gif"));
      out.push("  alt: " + quote(getValue("imageAlt") || "Draft profile image"));
      pushObjectList(out, "places", readRepeater(els.places, ["latitude", "longitude", "startYear", "endYear"]));
      pushObjectList(out, "contextEvents", readRepeater(els.events, ["year", "startYear", "endYear"]));
      pushObjectList(out, "importantWorks", readRepeater(els.works, ["year", "startYear", "endYear"]));
      pushObjectList(out, "storySeeds", readRepeater(els.storySeeds, ["year", "startYear", "endYear"]));
      pushObjectList(out, "relatedConnections", readRepeater(els.related));
      pushObjectList(out, "references", readRepeater(els.references));
      els.frontmatter.value = out.join("\n");
      renderReadiness();
      return els.frontmatter.value;
    };

    const parseSimple = (frontmatter) => {
      const data = {};
      const lines = frontmatter.split("\n");
      for (let index = 0; index < lines.length; index += 1) {
        const match = lines[index].match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
        if (!match) continue;
        const key = match[1];
        const value = match[2].trim();
        if (value) data[key] = value.replace(/^["']|["']$/g, "");
        if (!value && lines[index + 1]?.match(/^\s+-\s+/)) {
          const values = [];
          for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
            const item = lines[cursor].match(/^\s+-\s+(.*)$/);
            if (!item) break;
            values.push(item[1].replace(/^["']|["']$/g, ""));
            index = cursor;
          }
          data[key] = values;
        }
      }
      const imageMatch = frontmatter.match(/image:\n\s+src:\s*([^\n]+)\n\s+alt:\s*([^\n]+)/);
      if (imageMatch) {
        data.imageSrc = imageMatch[1].trim();
        data.imageAlt = imageMatch[2].trim().replace(/^["']|["']$/g, "");
      }
      return data;
    };

    const fillForm = (profile) => {
      const data = { ...parseSimple(profile.frontmatter), ...(profile.data || {}) };
      const image = data.image || {};
      setValue("slug", profile.id);
      setValue("kind", profile.kind);
      setValue("name", data.name);
      setValue("summary", data.summary);
      setValue("lifespan", data.lifespan);
      setValue("birthYear", data.birthYear);
      setValue("deathYear", data.deathYear);
      setValue("dateStatus", data.dateStatus || "needs-source");
      setValue("nationality", data.nationality);
      setValue("era", data.era);
      setValue("originalInstagramUrl", data.originalInstagramUrl);
      setTokens("occupations", Array.isArray(data.occupations) ? data.occupations : csv(data.occupation || ""));
      setTokens("themes", Array.isArray(data.themes) ? data.themes : []);
      setTokens("tags", Array.isArray(data.tags) ? data.tags : []);
      setValue("sourceCredit", data.sourceCredit);
      setValue("sourceCoverageStatus", data.sourceCoverageStatus || "needs-source");
      setValue("sourceStrength", data.sourceStrength || "needs-review");
      setValue("imageSrc", image.src || data.imageSrc || "/images/historical-babes.gif");
      setValue("imageAlt", image.alt || data.imageAlt);
      setValue("body", profile.body.trim());
      setTokens("openQuestions", Array.isArray(data.openQuestions) ? data.openQuestions : []);
      els.frontmatter.value = profile.frontmatter;
      clearRepeaters();
      (data.places || []).forEach(rowPlace);
      (data.contextEvents || []).forEach(rowEvent);
      (data.importantWorks || []).forEach(rowWork);
      (data.storySeeds || []).forEach(rowStorySeed);
      (data.references || []).forEach(rowReference);
      (data.relatedConnections || []).forEach(rowRelated);
      els.proposal.textContent = "No proposal yet.";
      renderReadiness();
    };

    const currentReadinessIssues = () => {
      const issues = [];
      if (getValue("dateStatus") !== "reviewed") issues.push("Date metadata is not reviewed.");
      if (getValue("sourceCoverageStatus") !== "reviewed") issues.push("Source coverage is not reviewed.");
      if (getValue("sourceStrength") === "needs-review") issues.push("Source strength still needs review.");
      if (!readRepeater(els.references).length) issues.push("At least one reference is required.");
      if (els.frontmatter.value.includes("needs-source") || els.frontmatter.value.includes("needs-review")) issues.push("Needs-source or needs-review markers remain.");
      return issues;
    };

    const renderReadiness = () => {
      const issues = currentReadinessIssues();
      els.readiness.innerHTML = issues.length
        ? "Promotion is blocked until review is complete:<ul>" + issues.map((issue) => "<li>" + escapeHtml(issue) + "</li>").join("") + "</ul>"
        : "Review readiness: no obvious blocking markers in the generated draft.";
    };

    const renderProfiles = () => {
      const query = els.filter.value.trim().toLowerCase();
      els.profiles.innerHTML = "";
      state.profiles
        .filter((profile) => !query || profile.name.toLowerCase().includes(query) || profile.id.includes(query))
        .forEach((profile) => {
          const button = document.createElement("button");
          button.className = "profile";
          button.innerHTML = "<strong>" + escapeHtml(profile.name) + "</strong><small>" + profile.kind + " / " + profile.id + "</small>";
          button.addEventListener("click", () => loadProfile(profile.kind, profile.id));
          els.profiles.append(button);
        });
    };
    const refreshSuggestions = () => {
      const jobs = [];
      const tags = [];
      const themes = [];
      const threads = [];
      const supports = [...allowed.supports];
      const reasons = [...allowed.reasons];
      state.profiles.forEach((profile) => {
        (profile.occupations || []).forEach((value) => jobs.push(value));
        (profile.tags || []).forEach((value) => tags.push(value));
        (profile.themes || []).forEach((value) => themes.push(value));
        (profile.contextThreads || []).forEach((value) => threads.push(value));
        (profile.referenceSupports || []).forEach((value) => supports.push(value));
        (profile.relatedReasons || []).forEach((value) => reasons.push(value));
      });
      datalistOptions("jobSuggestions", jobs);
      datalistOptions("tagSuggestions", tags);
      datalistOptions("themeSuggestions", themes);
      datalistOptions("threadSuggestions", threads);
      datalistOptions("personSuggestions", state.profiles.map((profile) => profile.id));
      datalistOptions("supportSuggestions", supports);
      datalistOptions("reasonSuggestions", reasons);
    };
    const refresh = async () => { state.profiles = await api("/api/profiles"); refreshSuggestions(); renderProfiles(); };
    const loadProfile = async (kind, id) => {
      const profile = await api("/api/profile?kind=" + encodeURIComponent(kind) + "&id=" + encodeURIComponent(id));
      state.loaded = profile;
      fillForm(profile);
      setStatus(kind === "published" ? "Published profile loaded. Saving creates or updates a draft copy." : "Draft loaded.");
    };

    els.refresh.addEventListener("click", refresh);
    els.filter.addEventListener("input", renderProfiles);
    els.addPlace.addEventListener("click", () => rowPlace());
    els.addEvent.addEventListener("click", () => rowEvent());
    els.addWork.addEventListener("click", () => rowWork());
    els.addStorySeed.addEventListener("click", () => rowStorySeed());
    els.addReference.addEventListener("click", () => rowReference());
    els.addRelated.addEventListener("click", () => rowRelated());
    document.querySelectorAll("[data-token-add]").forEach((button) => button.addEventListener("click", () => addToken(button.dataset.tokenAdd)));
    document.querySelectorAll("[data-token-input]").forEach((input) => input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addToken(input.dataset.tokenInput);
      }
    }));
    document.querySelector(".editor").addEventListener("input", (event) => {
      if (event.target.id !== "frontmatter" && event.target.id !== "proposal") buildFrontmatter();
      if (event.target.id === "frontmatter") renderReadiness();
    });
    els.newDraft.addEventListener("click", () => {
      state.loaded = null;
      clearRepeaters();
      ["slug", "kind", "name", "summary", "lifespan", "birthYear", "deathYear", "nationality", "era", "originalInstagramUrl", "sourceCredit", "imageAlt", "body"].forEach((id) => setValue(id, ""));
      ["occupations", "themes", "tags", "openQuestions"].forEach((id) => setTokens(id, []));
      setValue("dateStatus", "needs-source");
      setValue("sourceCoverageStatus", "needs-source");
      setValue("sourceStrength", "needs-review");
      setValue("imageSrc", "/images/historical-babes.gif");
      buildFrontmatter();
      setStatus("New draft form ready.");
    });
    els.copy.addEventListener("click", () => {
      if (!state.loaded || state.loaded.kind !== "published") return setStatus("Load a published profile before creating a draft copy.");
      api("/api/copy", { method: "POST", body: JSON.stringify({ id: state.loaded.id, slug: getValue("slug"), overwrite: true }) })
        .then((result) => refresh().then(() => loadProfile("draft", result.id)))
        .catch((error) => setStatus(error.message));
    });
    els.save.addEventListener("click", () => {
      const slug = slugify(getValue("slug") || getValue("name"));
      if (!slug) return setStatus("A draft slug or name is required.");
      setValue("slug", slug);
      api("/api/save", { method: "POST", body: JSON.stringify({ id: slug, frontmatter: buildFrontmatter(), body: getValue("body") }) })
        .then((result) => refresh().then(() => loadProfile("draft", result.id)))
        .catch((error) => setStatus(error.message));
    });
    els.promote.addEventListener("click", () => {
      if (!state.loaded || state.loaded.kind !== "draft") return setStatus("Load a draft before promoting.");
      const force = confirm("Promote even if needs-source/needs-review markers remain?");
      api("/api/promote", { method: "POST", body: JSON.stringify({ id: state.loaded.id, slug: getValue("slug"), overwrite: true, deleteDraft: false, force }) })
        .then((result) => refresh().then(() => loadProfile("published", result.id)))
        .catch((error) => setStatus(error.message));
    });
    els.demote.addEventListener("click", () => {
      if (!state.loaded || state.loaded.kind !== "published") return setStatus("Load a published profile before moving it to drafts.");
      if (!confirm("Move this published profile to drafts and remove it from the public collection?")) return;
      api("/api/demote", { method: "POST", body: JSON.stringify({ id: state.loaded.id, slug: getValue("slug"), overwrite: true }) })
        .then((result) => refresh().then(() => loadProfile("draft", result.id)))
        .catch((error) => setStatus(error.message));
    });
    els.cleanupDraft.addEventListener("click", () => {
      if (!state.loaded || state.loaded.kind !== "draft") return setStatus("Load a draft before using draft cleanup.");
      if (!confirm("Clean up this draft file only? Published profiles are not affected.")) return;
      api("/api/cleanup-draft", { method: "POST", body: JSON.stringify({ id: state.loaded.id, yes: true }) })
        .then(() => { state.loaded = null; els.newDraft.click(); return refresh(); })
        .then(() => setStatus("Cleaned up draft file. Published content was not touched."))
        .catch((error) => setStatus(error.message));
    });
    els.delete.addEventListener("click", () => {
      if (!state.loaded) return setStatus("Load a profile before deleting.");
      if (!confirm("Delete the loaded " + state.loaded.kind + " profile file? For drafts, prefer Clean Up Draft.")) return;
      api("/api/delete", { method: "POST", body: JSON.stringify({ kind: state.loaded.kind, id: state.loaded.id, yes: true }) })
        .then(() => { state.loaded = null; els.newDraft.click(); return refresh(); })
        .then(() => setStatus("Deleted loaded profile."))
        .catch((error) => setStatus(error.message));
    });
    els.enrich.addEventListener("click", () => {
      api("/api/enrich", { method: "POST", body: JSON.stringify({
        id: getValue("slug"),
        name: getValue("name"),
        birthYear: getValue("birthYear"),
        deathYear: getValue("deathYear"),
        lifespan: getValue("lifespan"),
        era: getValue("era"),
        occupations: readTokens("occupations"),
        tags: readTokens("tags"),
        themes: readTokens("themes"),
        places: readRepeater(els.places, ["latitude", "longitude", "startYear", "endYear"]),
        contextEvents: readRepeater(els.events, ["year", "startYear", "endYear"]),
        references: readRepeater(els.references),
        relatedConnections: readRepeater(els.related),
        openQuestions: readTokens("openQuestions"),
      }) })
        .then((proposal) => { els.proposal.textContent = JSON.stringify(proposal, null, 2); setStatus("Proposal generated as needs-review."); })
        .catch((error) => setStatus(error.message));
    });
    els.uploadImage.addEventListener("click", async () => {
      const file = els.imageUpload.files[0];
      if (!file) return setStatus("Choose an image file first.");
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = await api("/api/upload-image", { method: "POST", body: JSON.stringify({ name: file.name, dataUrl: reader.result }) });
          setValue("imageSrc", result.src);
          buildFrontmatter();
          setStatus("Uploaded image to " + result.src);
        } catch (error) {
          setStatus(error.message);
        }
      };
      reader.readAsDataURL(file);
    });

    els.newDraft.click();
    refresh().catch((error) => setStatus(error.message));
  </script>
</body>
</html>`;

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);

    if (request.method === "GET" && url.pathname === "/") {
      send(response, 200, editorPage);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/profiles") {
      send(response, 200, await listProfiles());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/profile") {
      const kind = url.searchParams.get("kind");
      const id = url.searchParams.get("id");
      if (!["published", "draft"].includes(kind) || !id) {
        send(response, 400, { error: "kind and id are required" });
        return;
      }
      send(response, 200, await readProfile(kind, id));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/draft") {
      const body = await readJsonBody(request);
      const validation = validateDraftInput(body);
      const result = await createDraft({
        ...validation.normalized,
        slug: slugify(body.slug || body.name),
        overwrite: Boolean(body.overwrite),
      });
      send(response, 200, { ...result, validation: validation.findings });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/copy") {
      const body = await readJsonBody(request);
      send(response, 200, await copyProfileToDraft(body.id, body));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/save") {
      const body = await readJsonBody(request);
      send(response, 200, await saveDraftSource(body.id, body.frontmatter || "", body.body || ""));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/promote") {
      const body = await readJsonBody(request);
      send(response, 200, await promoteDraft(body.id, body));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/demote") {
      const body = await readJsonBody(request);
      send(response, 200, await demotePublished(body.id, body));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/delete") {
      const body = await readJsonBody(request);
      if (!body.yes) {
        send(response, 400, { error: "delete requires confirmation" });
        return;
      }
      send(response, 200, await deleteProfile(body.kind, body.id));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/cleanup-draft") {
      const body = await readJsonBody(request);
      if (!body.yes) {
        send(response, 400, { error: "draft cleanup requires confirmation" });
        return;
      }
      send(response, 200, await cleanupDraft(body.id));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/enrich") {
      const body = await readJsonBody(request);
      send(response, 200, proposeEnrichment({ ...body, profiles: await listProfiles() }));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/upload-image") {
      const body = await readJsonBody(request);
      const match = body.dataUrl?.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) {
        send(response, 400, { error: "Expected an image data URL" });
        return;
      }
      const ext = (body.name?.split(".").pop() || match[1].split("/").pop() || "png")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const id = `${Date.now()}-${slugify(body.name?.replace(/\.[^.]+$/, "") || "profile-image")}.${ext}`;
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, id), Buffer.from(match[2], "base64"));
      send(response, 200, { src: `/images/editor-uploads/${id}` });
      return;
    }

    send(response, 404, { error: "Not found" });
  } catch (error) {
    send(response, 500, { error: error.message });
  }
});

export const checkEditorPageScript = (html = editorPage) => {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Editor page does not include an inline browser script.");
  new vm.Script(match[1], { filename: "local-people-editor.inline.js" });
  return true;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkEditorPageScript();
  server.listen(port, host, () => {
    const address = server.address();
    const servedPort = typeof address === "object" && address ? address.port : port;
    const origin = `http://${host}:${servedPort}`;
    console.log(`Local people editor running at ${origin}`);
    if (process.env.PEOPLE_EDITOR_HEALTHCHECK === "1") {
      Promise.all([fetch(origin), fetch(`${origin}/api/profiles`)])
        .then(async ([pageResponse, profilesResponse]) => {
          const html = await pageResponse.text();
          const profiles = await profilesResponse.json();
          checkEditorPageScript(html);
          if (!Array.isArray(profiles) || profiles.length === 0) {
            throw new Error("/api/profiles did not return profile rows for the sidebar.");
          }
          console.log(`Editor health check passed with ${profiles.length} profiles.`);
        })
        .then(() => server.close(() => process.exit(0)))
        .catch((error) => {
          console.error(error.message);
          server.close(() => process.exit(1));
        });
    }
  });
}
