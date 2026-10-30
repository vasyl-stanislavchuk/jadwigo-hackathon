/**
 * A step's JSON as the Data view draws it (dl-a38n.30): pretty-printed one line per key, each line
 * carrying the path into the lesson file it shows (`script.parts[1].steps[2].question.help.boost`),
 * so a finding's path and a change since the last draft can mark the lines they are about. The
 * key and the twin's key can be hidden, as the page's key switch hides them in the preview.
 */

export interface JsonLine {
  /** The path of the value the line opens or holds; a closing bracket repeats its container's. */
  path: string;
  depth: number;
  text: string;
}

const HIDDEN = "hidden: turn on Show the key";
const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const child = (path: string, key: string | number): string =>
  typeof key === "number" ? `${path}[${key}]` : `${path}.${key}`;

/** Every line of `value` printed at `path`; with `hideKey`, every `key` under a `question` or a
 * twin draws as one hidden line. */
export function jsonLines(value: unknown, path: string, hideKey = false): JsonLine[] {
  const out: JsonLine[] = [];
  const walk = (v: unknown, at: string, depth: number, label: string, comma: string) => {
    const head = label === "" ? "" : `${JSON.stringify(label)}: `;
    if (hideKey && /\.(question|twin)\.key$/.test(at)) {
      out.push({ path: at, depth, text: `${head}"${HIDDEN}"${comma}` });
      return;
    }
    const entries: [string | number, unknown][] = Array.isArray(v)
      ? v.map((x, i) => [i, x])
      : isObject(v)
        ? Object.entries(v)
        : [];
    if (!Array.isArray(v) && !isObject(v)) {
      out.push({ path: at, depth, text: `${head}${JSON.stringify(v) ?? "null"}${comma}` });
      return;
    }
    const [open, close] = Array.isArray(v) ? ["[", "]"] : ["{", "}"];
    if (entries.length === 0) {
      out.push({ path: at, depth, text: `${head}${open}${close}${comma}` });
      return;
    }
    out.push({ path: at, depth, text: `${head}${open}` });
    entries.forEach(([k, x], i) => {
      walk(
        x,
        child(at, k),
        depth + 1,
        typeof k === "number" ? "" : k,
        i < entries.length - 1 ? "," : "",
      );
    });
    out.push({ path: at, depth, text: `${close}${comma}` });
  };
  walk(value, path, 0, "", "");
  return out;
}

/** Every leaf path of `value` at `path` with its value as JSON, for a diff. */
function leaves(
  value: unknown,
  path: string,
  out = new Map<string, string>(),
): Map<string, string> {
  if (Array.isArray(value))
    value.forEach((x, i) => {
      leaves(x, child(path, i), out);
    });
  else if (isObject(value))
    for (const [k, x] of Object.entries(value)) leaves(x, child(path, k), out);
  else out.set(path, JSON.stringify(value) ?? "null");
  return out;
}

/** What changed in a step since the draft before: leaf paths added or changed, and removed. */
export function changesSince(
  before: unknown,
  after: unknown,
  path: string,
): { changed: Set<string>; removed: string[] } {
  const was = leaves(before, path);
  const now = leaves(after, path);
  const changed = new Set([...now].filter(([p, v]) => was.get(p) !== v).map(([p]) => p));
  const removed = [...was.keys()].filter((p) => !now.has(p));
  return { changed, removed };
}

/** Whether a line at `path` is what `target` names, or inside it. */
export const covers = (target: string, path: string): boolean =>
  path === target || path.startsWith(`${target}.`) || path.startsWith(`${target}[`);
