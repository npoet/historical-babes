export const frontmatterOf = (source) => {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);

  if (!match) {
    return { frontmatter: "", body: source };
  }

  return {
    frontmatter: match[1],
    body: source.slice(match[0].length),
  };
};

const parseScalar = (value) => {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
};

const parseInlineEntry = (value) => {
  const match = value.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
  if (!match) return parseScalar(value);
  return { [match[1]]: match[2] ? parseScalar(match[2]) : "" };
};

const parseIndentedBlock = (lines, startIndex) => {
  const first = lines[startIndex + 1];
  if (!first || (!/^\s+/.test(first) && !/^-\s+/.test(first))) return { value: undefined, endIndex: startIndex };

  if (/^\s*-\s+/.test(first)) {
    const items = [];
    let index = startIndex + 1;
    let current = null;
    let pendingArrayKey = null;

    for (; index < lines.length; index += 1) {
      const line = lines[index];
      if (!/^\s+/.test(line) && !/^-\s+/.test(line)) break;

      const item = line.match(/^\s*-\s+(.*)$/);
      if (item) {
        const parsed = parseInlineEntry(item[1]);
        if (current && pendingArrayKey && typeof parsed === "string") {
          current[pendingArrayKey].push(parsed);
          continue;
        }
        pendingArrayKey = null;
        if (current) items.push(current);
        current = typeof parsed === "object" && parsed !== null ? parsed : parsed;
        continue;
      }

      if (!current || typeof current !== "object") continue;

      const pair = line.match(/^\s+([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
      if (pair) {
        pendingArrayKey = null;
        const [, key, rawValue] = pair;
        if (rawValue) {
          current[key] = parseScalar(rawValue);
        } else {
          current[key] = [];
          pendingArrayKey = key;
        }
      }
    }

    if (current) items.push(current);
    return { value: items, endIndex: index - 1 };
  }

  const object = {};
  let index = startIndex + 1;
  for (; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^\s+/.test(line)) break;
    const pair = line.match(/^\s+([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (pair) object[pair[1]] = pair[2] ? parseScalar(pair[2]) : "";
  }

  return { value: object, endIndex: index - 1 };
};

export const parseFrontmatterSummary = (frontmatter) => {
  const data = {};
  const lines = frontmatter.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const scalar = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);

    if (!scalar) continue;

    const [, key, value] = scalar;
    if (value) {
      data[key] = parseScalar(value);
      continue;
    }

    if (lines[index + 1]?.match(/^\s+|^-\s+/)) {
      const parsed = parseIndentedBlock(lines, index);
      data[key] = parsed.value;
      index = parsed.endIndex;
    }
  }

  return data;
};

