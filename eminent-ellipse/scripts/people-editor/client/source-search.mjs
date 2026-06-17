export const clientSourceSearchScript = String.raw`    const unique = (values) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];
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
    const buildEnrichmentPayload = () => ({
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
    });
    const requestEnrichmentProposal = () => {
      api("/api/enrich", { method: "POST", body: JSON.stringify(buildEnrichmentPayload()) })
        .then((proposal) => {
          els.proposal.textContent = JSON.stringify(proposal, null, 2);
          setStatus("Proposal generated as needs-review.");
        })
        .catch((error) => setStatus(error.message));
    };
`;
