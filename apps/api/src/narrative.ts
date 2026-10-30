import type { Citation, ReportDigest, ReportNarrative } from "@jadwigo/contracts";

/**
 * What the narrative may say, checked before it is written (`patchReport` and the dream script):
 * every citation names something the digest holds, every number in its text is one the digest
 * gives, every proposal it words is one the digest made, and it names no level. Code computes every
 * level, and the parent never reads one (decision
 * jadwigo-hackathon/2026-10-29-parents-never-see-khan-s-level-names-khan-questions-keep-their-c).
 * Returns the problems found, none when the narrative may be written.
 */
export function narrativeProblems(narrative: ReportNarrative, digest: ReportDigest): string[] {
  const problems: string[] = [];
  const known = citable(digest);
  const citations: Citation[] = [
    ...narrative.answers.flatMap((a) => a.citations),
    ...narrative.proposals.flatMap((p) => p.citations),
  ];
  for (const citation of citations) {
    if (!known.has(citationKey(citation))) {
      problems.push(`the citation ${citationKey(citation)} is not in the digest`);
    }
  }
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
    const lower = text.toLowerCase();
    for (const [level, pattern] of LEVEL_WORDS) {
      if (pattern.test(lower)) problems.push(`the text names a level: ${level}`);
    }
  }
  return [...new Set(problems)];
}

/**
 * Level names in English and Polish, the Polish ones by the stems of their forms (`opanowane`,
 * `opanował`, `biegle`, `biegłość`). A stem matches inside a longer word too: `nieopanowane` names
 * a level all the same.
 */
const LEVEL_WORDS: readonly (readonly [string, RegExp])[] = [
  ["mastered", /mastered|mastery/u],
  ["proficient", /proficien/u],
  ["familiar", /(?<!\p{L})familiar/u],
  ["attempted", /(?<!\p{L})attempted/u],
  ["not started", /not_started|not started/u],
  ["opanowane", /opanowan|opanował/u],
  ["biegle", /(?<!\p{L})biegł|(?<!\p{L})biegle/u],
  ["zaznajomiony", /zaznajomion/u],
];

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
 * The numbers the narrative may give: the digest's counts, each mistake's times, the length of
 * each of its lists, and the digits inside a skill code it names (`row-7` is the 7s).
 */
function numbersOf(digest: ReportDigest): Set<number> {
  const numbers = new Set<number>([
    digest.counts.attempts,
    digest.counts.questions,
    digest.counts.days_played,
    digest.skills_moved.length,
    digest.needs_attention.length,
    digest.mistakes.length,
    digest.goals.length,
    digest.proposals.length,
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
