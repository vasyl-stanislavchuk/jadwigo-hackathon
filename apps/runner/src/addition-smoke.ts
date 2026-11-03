/** Acceptance for the opt-in addition-within-10 smoke. Adapted bank sources are allowed. */
function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Narrow proof for five plain numeric-entry sums; unsupported shapes fail explicitly. */
export function additionWithinTen(file: unknown): string[] {
  const parts = object(object(file)["script"])["parts"];
  const steps = Array.isArray(parts)
    ? parts.flatMap((part) => {
        const rows = object(part)["steps"];
        return Array.isArray(rows) ? rows : [];
      })
    : [];
  const errors: string[] = [];
  if (steps.length !== 5) errors.push(`expected five questions, got ${steps.length}`);
  for (const [i, raw] of steps.entries()) {
    const step = object(raw);
    const question = object(step["question"]);
    const data = object(question["data"]);
    const figure = object(data["figure"]);
    const expression =
      typeof figure["text"] === "string" ? figure["text"].replaceAll("$", "").trim() : "";
    const match = /^(\d+)\s*\+\s*(\d+)\s*=\s*\??$/.exec(expression);
    const a = Number(match?.[1]);
    const b = Number(match?.[2]);
    if (
      question["family"] !== "enter" ||
      data["input"] !== "number" ||
      figure["kind"] !== "expression" ||
      match === null ||
      a + b > 10
    ) {
      errors.push(`question ${i + 1}: cannot verify a plain addition within 10`);
      continue;
    }
    const accept = object(question["key"])["accept"];
    if (
      !Array.isArray(accept) ||
      accept.length === 0 ||
      !accept.every(
        (value) => typeof value === "string" && value.trim() !== "" && Number(value) === a + b,
      )
    ) {
      errors.push(`question ${i + 1}: key does not match the adapted expression`);
    }
    const source = object(step["based_on"])["question"];
    if (typeof source !== "string" || !source.startsWith("bank:")) {
      errors.push(`question ${i + 1}: missing bank provenance`);
    }
  }
  return errors;
}
