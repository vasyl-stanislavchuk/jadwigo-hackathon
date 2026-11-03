/** Acceptance for the opt-in addition-within-10 smoke. Adapted bank sources are allowed. */
function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function text(value: unknown): string {
  return typeof value === "string" ? value.replaceAll("$", "") : "";
}
function accepted(value: unknown): number | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const numbers = value.map((v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : NaN));
  const first = numbers[0];
  return first !== undefined && Number.isSafeInteger(first) && numbers.every((n) => n === first)
    ? first
    : null;
}
function facts(line: string) {
  return [...line.matchAll(/(\d+)\s*([+-])\s*(\d+)\s*=\s*(\d+)/g)].map((m) => ({
    a: Number(m[1]),
    op: m[2],
    b: Number(m[3]),
    result: Number(m[4]),
  }));
}

/** Verify supported enter expressions and slots templates/tables, with their actual keys. */
function arithmetic(question: Record<string, unknown>, errors: string[]): number[] {
  const data = object(question["data"]);
  const key = object(question["key"]);
  let lines: string[] = [];
  const answers: number[] = [];
  if (question["family"] === "enter") {
    const figure = object(data["figure"]);
    const answer = accepted(key["accept"]);
    if (answer === null || data["input"] !== "number" || figure["kind"] !== "expression") {
      errors.push("cannot verify numeric-entry data/key");
      return [];
    }
    answers.push(answer);
    const expression = text(figure["text"]).trim();
    if (!/^\d+\s*\+\s*\d+\s*=\s*\??$/.test(expression)) {
      errors.push("cannot verify a plain addition within 10");
      return [];
    }
    lines = [expression.replace(/=\s*\??$/, `= ${answer}`)];
  } else if (question["family"] === "slots") {
    const table = object(data["table"])["rows"];
    lines = [
      text(data["template"]),
      ...(Array.isArray(table)
        ? table.flatMap((row) => (Array.isArray(row) ? row.map(text) : []))
        : []),
    ];
    const gaps = object(key["gaps"]);
    if (!Array.isArray(data["gaps"]) || data["gaps"].length === 0) errors.push("no numeric gaps");
    for (const gap of Array.isArray(data["gaps"]) ? data["gaps"] : []) {
      const id = object(gap)["id"];
      const answer = typeof id === "string" ? accepted(object(gaps[id])["accept"]) : null;
      if (
        typeof id !== "string" ||
        answer === null ||
        !lines.some((line) => line.includes(`{${id}}`))
      ) {
        errors.push("cannot verify a gap's key and displayed placeholder");
        continue;
      }
      answers.push(answer);
      lines = lines.map((line) => line.replaceAll(`{${id}}`, String(answer)));
    }
  } else {
    errors.push("unsupported addition question shape");
    return [];
  }
  const equations = lines.flatMap(facts);
  if (equations.length === 0) errors.push("no verifiable addition equation in the displayed task");
  for (const { a, op, b, result } of equations) {
    if (op !== "+" || a + b > 10 || a + b !== result)
      errors.push("displayed data/key is not addition within 10");
  }
  return [...answers, ...equations.map((equation) => equation.result)];
}

function supportingHelp(question: Record<string, unknown>, answers: number[], errors: string[]) {
  const help = object(question["help"]);
  const worked = Array.isArray(help["worked"]) ? help["worked"].map(text) : [];
  const almost = Array.isArray(help["almost"]) ? help["almost"].map(text) : [];
  const hints = Array.isArray(help["hints"])
    ? help["hints"].map((hint) => text(object(hint)["text"]))
    : [];
  const lines = [
    ...worked,
    ...almost,
    ...hints,
    text(object(help["look"])["text"]),
    text(object(help["boost"])["text"]),
  ];
  for (const line of lines) {
    for (const { a, op, b, result } of facts(line)) {
      if (a > 10 || b > 10 || result > 10 || (op === "+" ? a + b : a - b) !== result)
        errors.push("help contains stale or incorrect arithmetic");
    }
  }
  const lastNumber = worked.join(" ").match(/\d+/g)?.at(-1);
  if (lastNumber !== undefined && !answers.includes(Number(lastNumber)))
    errors.push("worked solution ends with another question's answer");
  if (help["twin"] !== undefined)
    arithmetic({ ...object(help["twin"]), family: question["family"] }, errors);
}

/** Supported arithmetic is checked directly; unsupported shapes fail explicitly. */
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
    const findings: string[] = [];
    const answers = arithmetic(question, findings);
    supportingHelp(question, answers, findings);
    const provenance = object(step["based_on"]);
    if (typeof provenance["question"] !== "string" || !provenance["question"].startsWith("bank:"))
      findings.push("missing bank provenance");
    const changes = provenance["changes"];
    if (
      !Array.isArray(changes) ||
      changes.some(
        (change) =>
          typeof object(change)["why"] !== "string" || !String(object(change)["why"]).trim(),
      )
    )
      findings.push("adaptation reason is missing");
    errors.push(...findings.map((finding) => `question ${i + 1}: ${finding}`));
  }
  return errors;
}
