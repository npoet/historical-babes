export const clientDraftActionsScript = String.raw`    els.editorTheme.addEventListener("change", () => applyEditorTheme(els.editorTheme.value));
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
    els.enrich.addEventListener("click", requestEnrichmentProposal);
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
