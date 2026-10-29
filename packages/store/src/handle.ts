/**
 * A learner's handle from a first name: lower case, accents and Polish letters made plain, any
 * other run of characters one `-`. `taken` holds the handles the pod has; the first free one of
 * `name`, `name-2`, `name-3` and so on is returned.
 */
export function handleFor(firstName: string, taken: ReadonlySet<string>): string {
  const base =
    firstName
      .toLowerCase()
      .replaceAll("ł", "l")
      .normalize("NFKD")
      .replace(/\p{M}+/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "learner";
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const handle = `${base}-${n}`;
    if (!taken.has(handle)) return handle;
  }
}
