export const editorStyles = String.raw`    :root {
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
    }`;
