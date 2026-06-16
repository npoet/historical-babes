import path from "node:path";
import { projectRoot } from "../people-content.mjs";

export const host = "127.0.0.1";
export const port = Number.parseInt(process.env.PEOPLE_EDITOR_PORT || "4322", 10);
export const uploadDir = path.join(projectRoot, "public/images/editor-uploads");
export const publicImagesDir = path.join(projectRoot, "public/images");
export const defaultInstagramUrl = "https://www.instagram.com/ameliap0et/";
export const defaultSourceCredit = "Amelia Poet Instagram";
export const defaultProfileImage = "/images/profile-placeholder.svg";

export const imageContentTypes = {
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
};
