export const clientFormStateScript = String.raw`    const computedLifespan = () => {
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

`;
