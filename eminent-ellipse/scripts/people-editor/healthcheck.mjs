import vm from "node:vm";
import { editorPage } from "./page.mjs";

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
