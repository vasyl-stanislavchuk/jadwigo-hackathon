import type { Citation, ReportDigest, ReportNarrative } from "@jadwigo/contracts";

/**
 * What the narrative may say, checked before it is written (`patchReport` and the dream script):
 * every citation names an attempt, skill code or goal found anywhere in the digest, every number in
 * its text is one the digest gives, every proposal it words is one the digest made (at most 3, and
 * at most 2 asks), and it names no level. Code computes every
 * level, and the parent never reads one (decision
 * jadwigo-hackathon/2026-10-29-parents-never-see-khan-s-level-names-khan-questions-keep-their-c).
 * Returns the problems found, none when the narrative may be written.
 */
export function narrativeProblems(narrative: ReportNarrative, digest: ReportDigest): string[] {
  const problems: string[] = [];
  const known = stringsOf(digest);
  const citations: Citation[] = [
    ...narrative.answers.flatMap((a) => a.citations),
    ...narrative.proposals.flatMap((p) => p.citations),
  ];
  for (const citation of citations) {
    if (!known.has(citedId(citation))) {
      problems.push(`the citation ${citationKey(citation)} is not in the digest`);
    }
  }
  if (narrative.proposals.length > 3) problems.push("the narrative words more than 3 proposals");
  if (narrative.asks.length > 2) problems.push("the narrative asks more than 2 things");
  const proposals = new Set(digest.proposals.map((p) => p.id));
  for (const proposal of narrative.proposals) {
    if (!proposals.has(proposal.proposal_id)) {
      problems.push(`the digest has no proposal ${proposal.proposal_id}`);
    }
  }
  const numbers = numbersOf(digest);
  for (const text of textsOf(narrative)) {
    for (const number of text.match(/\d+/g) ?? []) {
      if (!numbers.has(Number(number))) problems.push(`the number ${number} is not in the digest`);
    }
    for (const [level] of text.matchAll(LEVEL)) {
      problems.push(`the text names a level: ${level}`);
    }
  }
  return [...new Set(problems)];
}

/**
 * The level names (MasteryLevel) and their Polish forms, any case: "opanowane", "biegle",
 * "zaznajomiony", "podjęto próbę", "nie rozpoczęto" in every form. The same pattern as the cli
 * lane's mirror, apps/cli/evals/report/narrative_check.py, so the eval and this check agree. A
 * word stands alone: a letter, digit or underscore on either side makes it another word.
 */
const LEVEL =
  /(?<![\p{L}\p{N}_])(mastered|proficient|proficiency|familiar|attempted|not[ _-]started|opanow\p{L}*|biegł\p{L}*|biegl\p{L}*|zaznajom\p{L}*|nie\s*rozpocz\p{L}*|nierozpocz\p{L}*|podję\p{L}*\s+prób\p{L}*|podjet\p{L}*\s+prob\p{L}*|próbowan\p{L}*)(?![\p{L}\p{N}_])/giu;

/** Each citation as one string, by its kind and what it names. */
function citationKey(citation: Citation): string {
  switch (citation.kind) {
    case "attempt":
      return `attempt ${citation.attempt_id}`;
    case "skill":
      return `skill ${citation.skill_code}`;
    case "goal":
      return `goal ${citation.goal_id}`;
  }
}

/** The attempt id, skill code or goal id a citation names. */
function citedId(citation: Citation): string {
  switch (citation.kind) {
    case "attempt":
      return citation.attempt_id;
    case "skill":
      return citation.skill_code;
    case "goal":
      return citation.goal_id;
  }
}

/** Every string anywhere in the digest: a citation holds when what it names is among them. */
function stringsOf(value: unknown, into = new Set<string>()): Set<string> {
  if (typeof value === "string") into.add(value);
  else if (Array.isArray(value)) for (const inner of value) stringsOf(inner, into);
  else if (value !== null && typeof value === "object") {
    for (const inner of Object.values(value)) stringsOf(inner, into);
  }
  return into;
}

/** Every attempt, skill code and goal the digest names, as citation keys. */
function citable(digest: ReportDigest): Set<string> {
  const keys = new Set<string>();
  const skill = (code: string) => keys.add(`skill ${code}`);
  const cite = (citations: readonly Citation[]) => {
    for (const c of citations) keys.add(citationKey(c));
  };
  for (const moved of digest.skills_moved) {
    skill(moved.skill_code);
    keys.add(`attempt ${moved.attempt_id}`);
  }
  for (const need of digest.needs_attention) {
    skill(need.skill_code);
    cite(need.citations);
  }
  for (const mistake of digest.mistakes) {
    for (const code of mistake.skill_codes) skill(code);
    cite(mistake.citations);
  }
  const entries = [
    ...digest.brief.entries,
    ...(digest.brief.school === "nothing_recorded" ? [] : digest.brief.school),
  ];
  for (const entry of entries) {
    skill(entry.skill_code);
    for (const goal of entry.goal_ids) keys.add(`goal ${goal}`);
  }
  for (const goal of digest.goals) keys.add(`goal ${goal.goal_id}`);
  for (const standing of digest.standing) cite(standing.citations);
  for (const proposal of digest.proposals) {
    for (const code of proposal.skill_codes) skill(code);
    cite(proposal.citations);
  }
  return keys;
}

/**
 * The numbers the narrative may give: the digest's counts, each mistake's times, and the digits
 * inside a skill code it names (`row-7` is the 7s). The cli lane's Python mirror keeps the same
 * rules (`/jadwigo-report-write`).
 */
function numbersOf(digest: ReportDigest): Set<number> {
  const numbers = new Set<number>([
    digest.counts.attempts,
    digest.counts.questions,
    digest.counts.days_played,
    ...digest.mistakes.map((m) => m.times),
  ]);
  for (const key of citable(digest)) {
    if (!key.startsWith("skill ")) continue;
    for (const digits of key.match(/\d+/g) ?? []) numbers.add(Number(digits));
  }
  return numbers;
}

/** Every sentence a parent reads. */
function textsOf(narrative: ReportNarrative): string[] {
  return [
    narrative.headline,
    narrative.direction_now,
    ...narrative.answers.map((a) => a.answer),
    ...narrative.proposals.flatMap((p) => [p.claim, p.rationale]),
    ...narrative.asks.flatMap((a) => [a.ask, a.why]),
  ];
}
