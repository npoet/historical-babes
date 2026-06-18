import { defaultProfileImage } from "./config.mjs";
import { editorClientScript } from "./client-script.mjs";
import { editorStyles } from "./styles.mjs";

export const editorPage = String.raw`<!doctype html>
<html lang="en" data-editor-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Historical Babes People Editor</title>
  <style>${editorStyles}</style>
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
  <script>${editorClientScript}</script>
</body>
</html>`;
