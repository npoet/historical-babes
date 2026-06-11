import http from "node:http";
import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
const publicImagesDir = path.join(projectRoot, "public/images");
const defaultInstagramUrl = "https://www.instagram.com/ameliap0et/";
const defaultSourceCredit = "Amelia Poet Instagram";
const defaultProfileImage = "/images/profile-placeholder.svg";

const imageContentTypes = {
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
};

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
<html lang="en" data-editor-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Historical Babes People Editor</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: "Instrument Sans Variable", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --color-bg: #120c18;
      --color-text: #f7edf9;
      --color-text-alt: #b8a8c5;
      --color-placeholder: #1e1726;
      --color-link: #ff68b5;
      --color-link-hover: #ff9ed1;
      --color-pink: #ff2f92;
      --color-magenta: #d81bff;
      --color-purple: #7b2cff;
      --color-red: #ff4d61;
      --border-color: rgba(255, 255, 255, 0.08);
      --panel-bg: rgba(30, 23, 38, .78);
      --card-bg: #1e1726;
      --shadow: 0 18px 50px rgba(0, 0, 0, .24);
    }
    html[data-editor-theme="light"] {
      color-scheme: light;
      --color-text: #24112f;
      --color-text-alt: #665477;
      --color-bg: #fffafd;
      --color-placeholder: #fff0f7;
      --color-link: #b4005b;
      --color-link-hover: #6f20d8;
      --color-pink: #b4005b;
      --color-magenta: #9c00c9;
      --color-purple: #5922c7;
      --color-red: #b93245;
      --border-color: rgba(180, 0, 91, 0.2);
      --panel-bg: rgba(255, 240, 247, 0.72);
      --card-bg: #ffffff;
      --shadow: 0 18px 50px rgba(36, 17, 47, 0.08);
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--color-bg); color: var(--color-text); line-height: 1; font-variant-ligatures: none; -webkit-font-smoothing: antialiased; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; padding: 2rem clamp(1rem, 3vw, 2rem) 1.5rem; border-bottom: 1px solid var(--border-color); background: var(--color-bg); }
    h1 { margin: 0; font-size: clamp(1.6rem, 4vw, 3.6rem); line-height: .85; font-weight: 900; letter-spacing: 0; }
    .hero-accent { background: linear-gradient(90deg, var(--color-pink), var(--color-magenta), var(--color-purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: var(--color-text-alt); font-size: .9rem; line-height: 1.45; max-width: 44rem; }
    main { display: grid; grid-template-columns: 320px minmax(0, 1fr); min-height: calc(100vh - 65px); }
    aside { border-right: 1px solid var(--border-color); padding: 1rem; overflow: auto; background: var(--panel-bg); }
    section { padding: clamp(1rem, 2vw, 1.5rem); overflow: auto; }
    button, input, select, textarea { font: inherit; }
    button { border: 1px solid transparent; background: var(--color-text); color: var(--color-bg); border-radius: 999px; padding: .62rem .85rem; cursor: pointer; font-weight: 800; line-height: 1; transition: transform .2s ease, border-color .2s ease, color .2s ease, background-color .2s ease; }
    button:hover { transform: translateY(-1px); color: var(--color-link-hover); border-color: var(--color-link-hover); }
    button.secondary { background: var(--card-bg); color: var(--color-text); border-color: var(--border-color); }
    button.danger { background: var(--color-red); color: white; }
    button:disabled { opacity: .55; cursor: wait; }
    input, select, textarea { width: 100%; border: 1px solid var(--border-color); border-radius: 8px; padding: .68rem .75rem; background: var(--card-bg); color: var(--color-text); }
    input:focus, select:focus, textarea:focus { outline: 2px solid rgba(255, 47, 146, .26); border-color: var(--color-pink); }
    textarea { min-height: 110px; resize: vertical; line-height: 1.45; }
    textarea.mono, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    label { display: grid; gap: .35rem; font-size: .82rem; font-weight: 800; color: var(--color-text); }
    fieldset { border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; background: var(--panel-bg); box-shadow: var(--shadow); }
    legend { padding: 0 .45rem; font-weight: 900; color: var(--color-pink); text-transform: uppercase; font-size: .75rem; }
    .stack { display: grid; gap: 12px; }
    .row { display: flex; gap: 8px; align-items: end; }
    .row > * { flex: 1; }
    .toolbar { display: flex; flex-wrap: wrap; gap: .5rem; }
    .inline-control { display: inline-flex; align-items: center; gap: .45rem; width: auto; min-height: 2.3rem; padding: 0 .25rem; }
    .inline-control input { width: 4.8rem; padding: .5rem .6rem; }
    .action-bar { padding: .45rem; border: 1px solid var(--border-color); border-radius: 999px; background: var(--card-bg); box-shadow: var(--shadow); }
    .list { display: grid; gap: 8px; }
    .profile { text-align: left; background: var(--card-bg); color: var(--color-text); border-color: var(--border-color); border-radius: 8px; line-height: 1.2; }
    .profile.active { border-color: var(--color-pink); box-shadow: 0 0 0 2px rgba(255, 47, 146, .18); }
    .profile small { display: block; color: var(--color-text-alt); margin-top: .25rem; font-weight: 650; }
    .badge { display: inline-flex; align-items: center; width: fit-content; min-height: 1.55rem; border: 1px solid var(--border-color); border-radius: 999px; padding: .25rem .55rem; font-size: .72rem; font-weight: 800; background: var(--card-bg); color: var(--color-pink); text-transform: uppercase; }
    .editor { display: grid; gap: 14px; max-width: 1180px; }
    .two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .four { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .notice { border: 1px solid var(--border-color); border-radius: 8px; padding: .75rem; background: var(--card-bg); color: var(--color-text-alt); white-space: pre-wrap; line-height: 1.45; }
    .repeat-list { display: grid; gap: 10px; }
    .repeat-item { display: grid; gap: 10px; border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; background: var(--card-bg); }
    .image-preview { display: grid; gap: .5rem; align-content: start; }
    .image-preview img { width: min(220px, 100%); aspect-ratio: 3 / 4; object-fit: cover; border: 1px solid var(--border-color); border-radius: 8px; background: var(--color-placeholder); box-shadow: var(--shadow); }
    .image-preview small { color: var(--color-text-alt); line-height: 1.4; }
    .token-field { display: grid; gap: 8px; }
    .token-list { display: flex; flex-wrap: wrap; gap: 6px; min-height: 38px; border: 1px solid var(--border-color); border-radius: 8px; padding: 6px; background: var(--card-bg); }
    .token { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border-color); border-radius: 999px; padding: 3px 7px; background: var(--color-placeholder); color: var(--color-text); font-size: 12px; font-weight: 750; }
    .token button { border: 0; background: transparent; color: inherit; padding: 0 2px; line-height: 1; }
    .readiness ul { margin: 8px 0 0; padding-left: 20px; }
    .search-links { display: grid; gap: .45rem; margin: .35rem 0 0; }
    .search-links a { color: var(--color-link); line-height: 1.35; text-decoration: none; }
    .search-links a:hover { color: var(--color-link-hover); }
    pre { margin: 0; overflow: auto; border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; background: var(--color-placeholder); max-height: 260px; line-height: 1.45; }
    details > summary { cursor: pointer; font-weight: 800; margin-bottom: 8px; }
    @media (max-width: 920px) {
      main { grid-template-columns: 1fr; }
      aside { border-right: 0; border-bottom: 1px solid #d7cec0; }
      .two, .three, .four { grid-template-columns: 1fr; }
      .row { flex-direction: column; align-items: stretch; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Historical <span class="hero-accent">Babes</span> Editor</h1>
      <div class="subtitle">Local draft intake, enrichment review, and publish prep for the profile collection.</div>
    </div>
    <div class="toolbar">
      <label>Editor Theme
        <select id="editorTheme">
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>
      <span class="badge">localhost only</span>
    </div>
  </header>
  <main>
    <aside class="stack">
      <div class="toolbar">
        <button id="refresh" type="button" class="secondary">Refresh</button>
        <button id="newDraft" type="button">New Draft</button>
        <button id="resetForm" type="button" class="secondary">Reset Form</button>
      </div>
      <label>Show
        <select id="profileKindFilter">
          <option value="all">Drafts + published</option>
          <option value="draft">Drafts only</option>
          <option value="published">Published only</option>
        </select>
      </label>
      <label>Filter <input id="filter" autocomplete="off" placeholder="Name or slug"></label>
      <div id="profileCounts" class="badge">0 profiles</div>
      <div id="profiles" class="list"></div>
    </aside>
    <section>
      <div class="editor">
        <div class="toolbar action-bar">
          <button id="save" type="button">Save Draft</button>
          <button id="copy" type="button" class="secondary">Copy Published To Draft</button>
          <button id="promote" type="button" class="secondary">Promote Draft</button>
          <button id="demote" type="button" class="secondary">Move Published To Draft</button>
          <button id="enrich" type="button" class="secondary">Review Enrichment</button>
          <button id="sourceSearches" type="button" class="secondary">Open Source Searches</button>
          <label class="inline-control">Search Tabs <input id="sourceSearchLimit" type="number" min="1" max="25" step="1" value="10"></label>
          <button id="openSite" type="button" class="secondary">Open Site View</button>
          <button id="cleanupDraft" type="button" class="secondary">Clean Up Draft</button>
          <button id="delete" type="button" class="danger">Delete Loaded</button>
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
            <label>Lifespan <input id="lifespan" placeholder="Auto from birth/death years"></label>
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
            <label>Nationalities
              <span class="token-field">
                <span id="nationalities" class="token-list" data-token-list></span>
                <span class="row"><input data-token-input="nationalities" list="nationalitySuggestions" placeholder="Add nationality"><button type="button" class="secondary" data-token-add="nationalities">Add</button></span>
              </span>
            </label>
            <label>Eras
              <span class="token-field">
                <span id="eras" class="token-list" data-token-list></span>
                <span class="row"><input data-token-input="eras" list="eraSuggestions" placeholder="Add era"><button type="button" class="secondary" data-token-add="eras">Add</button></span>
              </span>
            </label>
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
          <div class="toolbar">
            <button id="suggestTaxonomy" type="button" class="secondary">Suggest Tags + Themes</button>
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
            <div class="image-preview">
              <img id="imagePreview" src="${defaultProfileImage}" alt="Historical Babes placeholder portrait preview">
              <small>Placeholder is used until a sourced profile image is chosen.</small>
            </div>
            <div class="stack">
              <label>Image Path <input id="imageSrc" placeholder="${defaultProfileImage}"></label>
              <label>Image Alt Text <input id="imageAlt"></label>
            </div>
          </div>
          <div class="row">
            <label>Upload Local Image <input id="imageUpload" type="file" accept="image/*"></label>
            <button id="uploadImage" type="button" class="secondary">Upload To Site Images</button>
          </div>
        </fieldset>

        <fieldset class="stack">
          <legend>Places</legend>
          <div id="places" class="repeat-list"></div>
          <button id="addPlace" type="button" class="secondary">Add Place</button>
        </fieldset>

        <fieldset class="stack">
          <legend>Timeline Points</legend>
          <div id="events" class="repeat-list"></div>
          <button id="addEvent" type="button" class="secondary">Add Point</button>
        </fieldset>

        <fieldset class="stack">
          <legend>Important Works</legend>
          <div id="works" class="repeat-list"></div>
          <button id="addWork" type="button" class="secondary">Add Work</button>
        </fieldset>

        <fieldset class="stack">
          <legend>Story Prompts</legend>
          <div id="storySeeds" class="repeat-list"></div>
          <button id="addStorySeed" type="button" class="secondary">Add Story Prompt</button>
        </fieldset>

        <fieldset class="stack">
          <legend>References</legend>
          <div id="references" class="repeat-list"></div>
          <button id="addReference" type="button" class="secondary">Add Reference</button>
        </fieldset>

        <fieldset class="stack">
          <legend>Related People</legend>
          <div id="related" class="repeat-list"></div>
          <button id="addRelated" type="button" class="secondary">Add Related Person</button>
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
        <details open>
          <summary>Source Search Queue</summary>
          <div id="sourceSearchQueue" class="notice">Open source searches to generate targeted links.</div>
        </details>
        <datalist id="jobSuggestions"></datalist>
        <datalist id="tagSuggestions"></datalist>
        <datalist id="themeSuggestions"></datalist>
        <datalist id="eraSuggestions"></datalist>
        <datalist id="nationalitySuggestions"></datalist>
        <datalist id="threadSuggestions"></datalist>
        <datalist id="personSuggestions"></datalist>
        <datalist id="supportSuggestions"></datalist>
        <datalist id="reasonSuggestions"></datalist>
      </div>
    </section>
  </main>
  <script>
    const state = { profiles: [], loaded: null, slugTouched: false };
    const allowed = {
      placeTypes: ["birth", "death", "lived", "worked", "studied", "active", "event"],
      statuses: ["needs-source", "approximate", "reviewed"],
      layers: ["personal", "impact", "world"],
      importance: ["supporting", "major"],
      sourceTypes: ["primary", "archive", "museum", "book", "article", "reference", "authority"],
      supports: ["dates", "place", "work", "context event", "image", "quote", "background"],
      reasons: ["shared theme", "similar work", "same era", "connected place", "shared context event", "historical thread"],
    };
    const ids = ["profiles", "editorTheme", "profileKindFilter", "profileCounts", "filter", "status", "readiness", "slug", "kind", "name", "summary", "lifespan", "birthYear", "deathYear", "dateStatus", "nationalities", "eras", "originalInstagramUrl", "occupations", "themes", "tags", "sourceCredit", "sourceCoverageStatus", "sourceStrength", "imageSrc", "imageAlt", "imagePreview", "imageUpload", "places", "events", "works", "storySeeds", "references", "related", "body", "openQuestions", "frontmatter", "proposal", "sourceSearchQueue", "refresh", "newDraft", "resetForm", "save", "copy", "promote", "demote", "suggestTaxonomy", "enrich", "sourceSearchLimit", "sourceSearches", "openSite", "cleanupDraft", "delete", "addPlace", "addEvent", "addWork", "addStorySeed", "addReference", "addRelated", "uploadImage", "jobSuggestions", "tagSuggestions", "themeSuggestions", "eraSuggestions", "nationalitySuggestions", "threadSuggestions", "personSuggestions", "supportSuggestions", "reasonSuggestions"];
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
    const setStatus = (message) => { els.status.textContent = new Date().toLocaleTimeString() + " - " + message; };
    const csv = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);
    const lines = (value) => value.split("\n").map((item) => item.trim()).filter(Boolean);
    const slugify = (value) => String(value || "")
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[-\s]+/g, "-");
    const quote = (value) => JSON.stringify(value || "");
    const numberOrBlank = (value) => value === "" || value === undefined ? "" : Number.parseInt(value, 10);
    const setValue = (id, value) => { els[id].value = value ?? ""; };
    const getValue = (id) => els[id].value.trim();
    const defaultInstagramUrl = "${defaultInstagramUrl}";
    const defaultSourceCredit = "${defaultSourceCredit}";
    const defaultProfileImage = "${defaultProfileImage}";
    const applyEditorTheme = (theme) => {
      const next = theme === "light" ? "light" : "dark";
      document.documentElement.dataset.editorTheme = next;
      els.editorTheme.value = next;
      localStorage.setItem("peopleEditorTheme", next);
    };
    applyEditorTheme(localStorage.getItem("peopleEditorTheme") || "dark");
    const syncImagePreview = () => {
      const src = getValue("imageSrc") || defaultProfileImage;
      els.imagePreview.src = src;
      els.imagePreview.alt = getValue("imageAlt") || "Historical Babes placeholder portrait preview";
    };

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
      token.querySelector("button").addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        token.remove();
        buildFrontmatter();
      });
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
    const unique = (values) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];
    const googleUrl = (query) => "https://www.google.com/search?q=" + encodeURIComponent(query);
    const hostOf = (url) => {
      try {
        return new URL(url, window.location.href).hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    };
    const sourceSearchLimit = () => Math.max(1, Math.min(25, Number.parseInt(getValue("sourceSearchLimit") || "10", 10) || 10));
    const searchLink = (query, index) => '<a href="' + googleUrl(query) + '" target="_blank" rel="noopener">' + (index + 1) + ". " + escapeHtml(query) + "</a>";
    const renderSourceSearchQueue = (queries) => {
      els.sourceSearchQueue.innerHTML = queries.length
        ? '<div class="search-links">' + queries.map(searchLink).join("") + "</div>"
        : "Add a name before opening source searches.";
    };
    const buildSourceSearchQueries = () => {
      const name = getValue("name") || getValue("slug");
      if (!name) return [];
      const places = readRepeater(els.places, ["latitude", "longitude", "startYear", "endYear"]);
      const events = readRepeater(els.events, ["year", "startYear", "endYear"]);
      const works = readRepeater(els.works, ["year", "startYear", "endYear"]);
      const references = readRepeater(els.references);
      const roles = readTokens("occupations");
      const themes = readTokens("themes");
      const eras = readTokens("eras");
      const nationalities = readTokens("nationalities");
      const dates = [getValue("birthYear"), getValue("deathYear")].filter(Boolean).join(" ");
      const exact = '"' + name + '"';
      const base = [
        exact + " official biography",
        exact + " birth date death date",
        exact + " archive primary sources",
        exact + " museum collection biography",
        exact + " library special collections",
        exact + " university biography",
        exact + " authority record VIAF Library of Congress",
        exact + " encyclopedia reliable source",
        exact + " photograph portrait public domain source",
        exact + " quotes letters writings primary source",
      ];
      if (dates) {
        base.push(exact + " " + dates + " birth death");
        base.push(exact + " " + dates + " biography archive");
      }
      nationalities.slice(0, 2).forEach((nationality) => {
        base.push(exact + " " + nationality + " archive biography");
        base.push(exact + " " + nationality + " museum");
      });
      roles.slice(0, 3).forEach((role) => {
        base.push(exact + " " + role + " primary source");
        base.push(exact + " " + role + " historical impact");
      });
      themes.slice(0, 2).forEach((theme) => {
        base.push(exact + " " + theme + " historical context");
        base.push(exact + " " + theme + " source");
      });
      eras.slice(0, 2).forEach((era) => {
        base.push(exact + " " + era + " historical context archive");
        base.push(exact + " " + era + " timeline");
      });
      places.slice(0, 4).forEach((place) => {
        if (place.name) base.push(exact + " " + '"' + place.name + '"' + " source");
        if (place.name && place.type) base.push(exact + " " + place.type + " " + '"' + place.name + '"');
      });
      events.slice(0, 4).forEach((event) => {
        if (event.label) base.push(exact + " " + '"' + event.label + '"' + " source");
        if (event.thread) base.push(exact + " " + '"' + event.thread + '"' + " archive");
        if (event.year && event.label) base.push(exact + " " + event.year + " " + '"' + event.label + '"');
      });
      works.slice(0, 3).forEach((work) => {
        if (work.title) base.push(exact + " " + '"' + work.title + '"' + " primary source");
        if (work.title) base.push(exact + " " + '"' + work.title + '"' + " archive");
      });
      references.slice(0, 4).forEach((reference) => {
        if (reference.title && reference.title !== defaultSourceCredit) base.push(exact + " " + '"' + reference.title + '"');
        if (reference.url && hostOf(reference.url)) base.push(exact + " " + hostOf(reference.url));
      });
      return unique(base).slice(0, sourceSearchLimit());
    };
    const openSourceSearches = () => {
      const queries = buildSourceSearchQueries();
      renderSourceSearchQueue(queries);
      if (!queries.length) return setStatus("Add a name before opening source searches.");
      let opened = 0;
      queries.forEach((query) => {
        const tab = window.open(googleUrl(query), "_blank", "noopener");
        if (tab) opened += 1;
      });
      setStatus(opened
        ? "Opened " + opened + " of " + queries.length + " targeted source search tabs. The full search queue is also listed below."
        : "Your browser blocked the source search tabs. Use the generated search queue links below or allow popups for this local editor.");
    };
    const computedLifespan = () => {
      const birth = getValue("birthYear");
      const death = getValue("deathYear");
      if (birth && death) return birth + "-" + death;
      if (birth) return birth + "-";
      return "";
    };
    const syncLifespan = () => {
      const next = computedLifespan();
      if (!next) return;
      setValue("lifespan", next);
    };
    const syncSlugFromName = () => {
      if (state.slugTouched) return;
      const suggested = slugify(getValue("name"));
      if (suggested) setValue("slug", suggested);
    };
    const addSuggestionToken = (id, value) => {
      renderToken(els[id], value);
    };
    const suggestTaxonomy = () => {
      const occupations = readTokens("occupations").join(" ").toLowerCase();
      const eras = readTokens("eras");
      const nationalities = readTokens("nationalities");
      const added = [];
      nationalities.forEach((value) => {
        addSuggestionToken("tags", value);
        added.push(value);
      });
      eras.forEach((value) => {
        addSuggestionToken("tags", value);
        added.push(value);
      });
      readTokens("occupations").forEach((value) => {
        addSuggestionToken("tags", value);
        added.push(value);
      });
      const themeRules = [
        [/activist|suffrag|labor|civil rights|reformer|resistance|abolition/i, "Activism"],
        [/writer|author|poet|journalist|novelist|screenwriter|editor/i, "Writing"],
        [/teacher|educator|professor|student|school|university/i, "Education"],
        [/scientist|chemist|physicist|astronomer|engineer|inventor|mathematician|virologist|technologist/i, "Science and Innovation"],
        [/artist|performer|magician|musician|dancer|chef|guitarist|illustrator|cartographer|designer|cookbook/i, "Arts and Culture"],
        [/queen|ruler|military|war|spy|diplomat|politic|power/i, "Power and Resistance"],
      ];
      themeRules.forEach(([pattern, theme]) => {
        if (pattern.test(occupations + " " + eras.join(" "))) {
          addSuggestionToken("themes", theme);
          added.push(theme);
        }
      });
      addSuggestionToken("themes", "Global History");
      buildFrontmatter();
      setStatus(added.length ? "Added taxonomy suggestions from current fields." : "No new suggestions found from current fields.");
    };
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
      syncLifespan();
      const scalar = ["summary", "lifespan", "sourceCredit", "originalInstagramUrl"];
      scalar.forEach((key) => { const value = getValue(key); if (value) out.push(key + ": " + quote(value)); });
      ["birthYear", "deathYear"].forEach((key) => { const value = numberOrBlank(getValue(key)); if (value !== "") out.push(key + ": " + value); });
      out.push("dateStatus: " + getValue("dateStatus"));
      const nationalities = readTokens("nationalities");
      if (nationalities.length) {
        pushList(out, "nationalities", nationalities);
        out.push("nationality: " + quote(nationalities.join(", ")));
      }
      const eras = readTokens("eras");
      if (eras.length) {
        pushList(out, "eras", eras);
        out.push("era: " + quote(eras.join(", ")));
      }
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
      out.push("  src: " + (getValue("imageSrc") || defaultProfileImage));
      out.push("  alt: " + quote(getValue("imageAlt") || "Historical Babes placeholder portrait"));
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
      state.slugTouched = true;
      setValue("slug", profile.id);
      setValue("kind", profile.kind);
      setValue("name", data.name);
      setValue("summary", data.summary);
      setValue("lifespan", data.lifespan);
      setValue("birthYear", data.birthYear);
      setValue("deathYear", data.deathYear);
      setValue("dateStatus", data.dateStatus || "needs-source");
      setTokens("nationalities", Array.isArray(data.nationalities) ? data.nationalities : csv(data.nationality || ""));
      setTokens("eras", Array.isArray(data.eras) ? data.eras : csv(data.era || ""));
      setValue("originalInstagramUrl", data.originalInstagramUrl || defaultInstagramUrl);
      setTokens("occupations", Array.isArray(data.occupations) ? data.occupations : csv(data.occupation || ""));
      setTokens("themes", Array.isArray(data.themes) ? data.themes : []);
      setTokens("tags", Array.isArray(data.tags) ? data.tags : []);
      setValue("sourceCredit", data.sourceCredit || defaultSourceCredit);
      setValue("sourceCoverageStatus", data.sourceCoverageStatus || "needs-source");
      setValue("sourceStrength", data.sourceStrength || "needs-review");
      setValue("imageSrc", image.src || data.imageSrc || defaultProfileImage);
      setValue("imageAlt", image.alt || data.imageAlt);
      syncImagePreview();
      setValue("body", profile.body.trim());
      setTokens("openQuestions", Array.isArray(data.openQuestions) ? data.openQuestions : []);
      els.frontmatter.value = profile.frontmatter;
      clearRepeaters();
      (data.places || []).forEach(rowPlace);
      (data.contextEvents || []).forEach(rowEvent);
      (data.importantWorks || []).forEach(rowWork);
      (data.storySeeds || []).forEach(rowStorySeed);
      (data.references || []).forEach(rowReference);
      if (!(data.references || []).length && profile.kind === "draft") {
        rowReference({ title: defaultSourceCredit, url: defaultInstagramUrl, type: "reference", status: "needs-source", supports: ["background"] });
      }
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
      const kindFilter = els.profileKindFilter.value;
      const total = state.profiles.length;
      const draftCount = state.profiles.filter((profile) => profile.kind === "draft").length;
      const publishedCount = state.profiles.filter((profile) => profile.kind === "published").length;
      let shown = 0;
      els.profiles.innerHTML = "";
      state.profiles
        .filter((profile) => kindFilter === "all" || profile.kind === kindFilter)
        .filter((profile) => !query || profile.name.toLowerCase().includes(query) || profile.id.includes(query))
        .forEach((profile) => {
          shown += 1;
          const button = document.createElement("button");
          const active = state.loaded && state.loaded.kind === profile.kind && state.loaded.id === profile.id;
          button.className = "profile" + (active ? " active" : "");
          button.innerHTML = "<strong>" + escapeHtml(profile.name) + "</strong><small>" + profile.kind + " / " + profile.id + "</small>";
          button.addEventListener("click", () => loadProfile(profile.kind, profile.id));
          els.profiles.append(button);
        });
      els.profileCounts.textContent = shown + " shown / " + total + " total (" + draftCount + " draft, " + publishedCount + " published)";
    };
    const refreshSuggestions = () => {
      const jobs = [];
      const tags = [];
      const themes = [];
      const eras = [];
      const nationalities = [];
      const threads = [];
      const supports = [...allowed.supports];
      const reasons = [...allowed.reasons];
      state.profiles.forEach((profile) => {
        (profile.occupations || []).forEach((value) => jobs.push(value));
        (profile.nationalities || []).forEach((value) => nationalities.push(value));
        (profile.tags || []).forEach((value) => tags.push(value));
        (profile.themes || []).forEach((value) => themes.push(value));
        (profile.eras || csv(profile.era || "")).forEach((value) => eras.push(value));
        (profile.contextThreads || []).forEach((value) => threads.push(value));
        (profile.referenceSupports || []).forEach((value) => supports.push(value));
        (profile.relatedReasons || []).forEach((value) => reasons.push(value));
      });
      datalistOptions("jobSuggestions", jobs);
      datalistOptions("tagSuggestions", tags);
      datalistOptions("themeSuggestions", themes);
      datalistOptions("eraSuggestions", eras);
      datalistOptions("nationalitySuggestions", nationalities);
      datalistOptions("threadSuggestions", threads);
      datalistOptions("personSuggestions", state.profiles.map((profile) => profile.id));
      datalistOptions("supportSuggestions", supports);
      datalistOptions("reasonSuggestions", reasons);
    };
    const refresh = async () => {
      setStatus("Refreshing profile list...");
      state.profiles = await api("/api/profiles");
      refreshSuggestions();
      renderProfiles();
      setStatus("Profile list refreshed with " + state.profiles.length + " profiles.");
    };
    const loadProfile = async (kind, id) => {
      const profile = await api("/api/profile?kind=" + encodeURIComponent(kind) + "&id=" + encodeURIComponent(id));
      state.loaded = profile;
      fillForm(profile);
      renderProfiles();
      setStatus(kind === "published" ? "Published profile loaded. Saving creates or updates a draft copy." : "Draft loaded.");
    };

    els.editorTheme.addEventListener("change", () => applyEditorTheme(els.editorTheme.value));
    els.refresh.addEventListener("click", refresh);
    els.profileKindFilter.addEventListener("change", renderProfiles);
    els.filter.addEventListener("input", renderProfiles);
    els.addPlace.addEventListener("click", () => rowPlace());
    els.addEvent.addEventListener("click", () => rowEvent());
    els.addWork.addEventListener("click", () => rowWork());
    els.addStorySeed.addEventListener("click", () => rowStorySeed());
    els.addReference.addEventListener("click", () => rowReference());
    els.addRelated.addEventListener("click", () => rowRelated());
    els.suggestTaxonomy.addEventListener("click", suggestTaxonomy);
    document.querySelectorAll("[data-token-add]").forEach((button) => button.addEventListener("click", () => addToken(button.dataset.tokenAdd)));
    document.querySelectorAll("[data-token-input]").forEach((input) => input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addToken(input.dataset.tokenInput);
      }
    }));
    document.querySelector(".editor").addEventListener("input", (event) => {
      if (event.target.id === "slug") state.slugTouched = true;
      if (event.target.id === "name") syncSlugFromName();
      if (event.target.id === "imageSrc" || event.target.id === "imageAlt") syncImagePreview();
      if (event.target.id !== "frontmatter" && event.target.id !== "proposal") buildFrontmatter();
      if (event.target.id === "frontmatter") renderReadiness();
    });
    els.newDraft.addEventListener("click", () => {
      state.loaded = null;
      state.slugTouched = false;
      clearRepeaters();
      ["slug", "kind", "name", "summary", "lifespan", "birthYear", "deathYear", "imageAlt", "body"].forEach((id) => setValue(id, ""));
      ["nationalities", "eras", "occupations", "themes", "tags", "openQuestions"].forEach((id) => setTokens(id, []));
      setValue("originalInstagramUrl", defaultInstagramUrl);
      setValue("sourceCredit", defaultSourceCredit);
      setValue("dateStatus", "needs-source");
      setValue("sourceCoverageStatus", "needs-source");
      setValue("sourceStrength", "needs-review");
      setValue("imageSrc", defaultProfileImage);
      setValue("imageAlt", "Historical Babes placeholder portrait");
      syncImagePreview();
      rowReference({ title: defaultSourceCredit, url: defaultInstagramUrl, type: "reference", status: "needs-source", supports: ["background"] });
      buildFrontmatter();
      setStatus("New draft form ready.");
    });
    els.resetForm.addEventListener("click", () => {
      state.loaded = null;
      els.newDraft.click();
      setStatus("Form reset. Nothing was saved.");
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
      setStatus("Saving draft " + slug + "...");
      api("/api/save", { method: "POST", body: JSON.stringify({ id: slug, frontmatter: buildFrontmatter(), body: getValue("body") }) })
        .then((result) => {
          els.profileKindFilter.value = "draft";
          els.filter.value = "";
          return refresh().then(() => loadProfile("draft", result.id)).then(() => setStatus("Saved draft " + result.id + ". It is now visible in Drafts only."));
        })
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
        eras: readTokens("eras"),
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
    els.sourceSearches.addEventListener("click", openSourceSearches);
    els.openSite.addEventListener("click", () => {
      const slug = slugify(getValue("slug") || getValue("name"));
      window.open(slug ? "http://127.0.0.1:4321/" + slug + "/" : "http://127.0.0.1:4321/", "_blank");
    });
    els.uploadImage.addEventListener("click", async () => {
      const file = els.imageUpload.files[0];
      if (!file) return setStatus("Choose an image file first.");
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = await api("/api/upload-image", { method: "POST", body: JSON.stringify({ name: file.name, dataUrl: reader.result }) });
          setValue("imageSrc", result.src);
          syncImagePreview();
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

    if (request.method === "GET" && url.pathname.startsWith("/images/")) {
      const relativeImagePath = decodeURIComponent(url.pathname.replace(/^\/images\//, ""));
      const file = path.resolve(publicImagesDir, relativeImagePath);
      if (!file.startsWith(publicImagesDir + path.sep)) {
        send(response, 403, { error: "Forbidden" });
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const contentType = imageContentTypes[ext];
      if (!contentType) {
        send(response, 415, { error: "Unsupported image type" });
        return;
      }
      try {
        const asset = await readFile(file);
        response.writeHead(200, {
          "content-type": contentType,
          "cache-control": "no-store",
        });
        response.end(asset);
      } catch (error) {
        if (error.code === "ENOENT") send(response, 404, { error: "Image not found" });
        else throw error;
      }
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
  if (!match[1].includes("const slugify =")) {
    throw new Error("Editor browser script must define its own slugify helper for slug suggestions and saves.");
  }
  if (!match[1].includes('replace(/[^\\w\\s-]/g, "")') || !match[1].includes('replace(/[-\\s]+/g, "-")')) {
    throw new Error("Editor browser slugify helper must preserve letters and collapse whitespace into dashes.");
  }
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
