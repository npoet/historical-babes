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
  promoteDraft,
  proposeEnrichment,
  readProfile,
  saveDraftSource,
  slugify,
  validateDraftInput,
} from "../people-content.mjs";
import {
  host,
  imageContentTypes,
  port,
  publicImagesDir,
  uploadDir,
} from "./config.mjs";
import { readJsonBody, send } from "./http.mjs";
import { editorPage } from "./page.mjs";

export const createPeopleEditorServer = () => http.createServer(async (request, response) => {
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

