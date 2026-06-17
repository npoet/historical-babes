export const slugify = (value) =>
  value
    .toString()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-");

export const yamlString = (value) => JSON.stringify(value ?? "");
export const yamlNumber = (value) => Number.parseInt(value, 10);
export const isPresent = (value) => value !== undefined && value !== null && value !== "";
export const cleanObject = (object) =>
  Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length),
    ),
  );

export const normalizeList = (value) => {
  if (Array.isArray(value)) return value.map((item) => item.toString().trim()).filter(Boolean);
  if (!value) return [];
  return value
    .toString()
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};
