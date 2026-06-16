import { defaultInstagramUrl, defaultProfileImage, defaultSourceCredit } from "./config.mjs";

export const editorClientScript = String.raw`    const state = { profiles: [], loaded: null, slugTouched: false };
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
    refresh().catch((error) => setStatus(error.message));`;
