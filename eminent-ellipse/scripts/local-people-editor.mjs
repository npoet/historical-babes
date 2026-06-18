import { pathToFileURL } from "node:url";
import { host, port } from "./people-editor/config.mjs";
import { checkEditorPageScript } from "./people-editor/healthcheck.mjs";
import { editorPage } from "./people-editor/page.mjs";
import { createPeopleEditorServer } from "./people-editor/server.mjs";

export { checkEditorPageScript, editorPage };

export const server = createPeopleEditorServer();

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
