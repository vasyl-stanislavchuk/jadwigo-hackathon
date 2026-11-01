/**
 * The PII guard, a port of `jw.pii` (`apps/cli/src/jw/pii.py`, dl-e8ov.5.2.18), for the one tier
 * that trains on what it is sent: `contributor`. A call there carries no learner data by design
 * (decision dl-2uq1, accepted 2026-11-01); the guard is the fence that keeps a learner's name off it anyway. It
 * replaces learner names, email addresses and phone numbers with placeholders and keeps the map,
 * so the answer can have the originals put back on the way out. A `private` call is not guarded:
 * it carries the parent's own child's data on purpose, to a tier that trains on none of it.
 *
 * The matching rules are pii.py's, case by case (its docstring says why each exists): every
 * Polish case form of a name (`nameForms`), case and diacritics ignored ("kasia", "Lucja" for
 * Łucja), a form of 4 letters or more also at the start of a longer word ("Kasiunia",
 * "KasiaNowak"), a capital after a lowercase letter starting a word ("NowakKasia"), compatibility
 * forms read as plain letters (full-width, math bold) and format characters ignored inside a name.
 * A shorter form ("Ola") is only a whole word, so "olej" and "Olaf" stay.
 *
 * pii.py counts code points; JavaScript strings count UTF-16 units. Every index here is a code
 * point index (`Array.from`), so math-bold letters, which are surrogate pairs, sit where they do
 * in Python.
 */

const NAME = "NAME";
const EMAIL = "EMAIL";
const PHONE = "PHONE";
type Kind = typeof NAME | typeof EMAIL | typeof PHONE;

const PLACEHOLDER = /\[(?:NAME|EMAIL|PHONE)_\d+\]/g;
const W = "\\p{L}\\p{N}_"; // Python's \w over str
const EMAIL_RE = new RegExp(`(?<![${W}.+-])[${W}.+-]+@[${W}-]+(?:\\.[${W}-]+)+(?![${W}-])`, "gu");
// A run of digits with single spaces, dots or dashes between groups, an optional +country code
// and an optional (area code), kept only with 9 digits or more: "27 + 45" and a year never match.
const PHONE_RE = new RegExp(
  `(?<![${W}+])(?:\\+\\p{Nd}{1,3}[ .-]?)?(?:\\(\\p{Nd}{1,4}\\)[ .-]?)?\\p{Nd}{2,4}(?:[ .-]?\\p{Nd}{2,4}){1,4}(?![${W}])`,
  "gu",
);
const MIN_PHONE_DIGITS = 9;
// A form this long is a name at the start of any word; a shorter one only as a whole word.
const PREFIX_LEN = 4;

const chars = (s: string): string[] => Array.from(s);
const len = (s: string): number => chars(s).length;
/** `s` without its last `n` code points, as Python's `s[:-n]`. */
const cut = (s: string, n: number): string => chars(s).slice(0, -n).join("");
const isAlpha = (ch: string | undefined): boolean => ch !== undefined && /^\p{L}$/u.test(ch);
const isUpper = (ch: string | undefined): boolean =>
  ch !== undefined && /^\p{Uppercase}$/u.test(ch);
const isLower = (ch: string | undefined): boolean =>
  ch !== undefined && /^\p{Lowercase}$/u.test(ch);
const isFormat = (ch: string): boolean => /^\p{Cf}$/u.test(ch);

// ---------------------------------------------------------------- names ------

// Locative and vocative endings soften the last consonant: Dawid -> Dawidzie, Marta -> Marcie.
const SOFTEN: Readonly<Record<string, readonly string[]>> = {
  d: ["dzie"],
  t: ["cie"],
  r: ["rze"],
  ł: ["le"],
  g: ["dze"],
  k: ["ce", "ku"],
  b: ["bie"],
  n: ["nie"],
  m: ["mie"],
  w: ["wie"],
  s: ["sie"],
  p: ["pie"],
};
// Soft consonants spell their stem with an i before a vowel: Jaś -> Jasia, Staś -> Stasiem.
const SOFT_STEM: Readonly<Record<string, string>> = { ś: "si", ć: "ci", ń: "ni", ź: "zi", ż: "ż" };

const last = (s: string): string => (chars(s).at(-1) ?? "").toLowerCase();

/** Every form `name` takes in a Polish or English sentence, the name itself included. */
export function nameForms(raw: string): Set<string> {
  const name = raw.trim();
  if (name === "") return new Set();
  const forms = new Set([name]);
  const add = (stem: string, endings: readonly string[]) => {
    for (const e of endings) forms.add(stem + e);
  };
  const low = name.toLowerCase();
  if (low.endsWith("ia")) {
    // Kasia: Kasi, Kasię, Kasią, Kasiu, Kasio; Julia: Julii
    add(cut(name, 1), ["", "a", "ę", "ą", "u", "o", "i"]);
  } else if (low.endsWith("a")) {
    // Ola: Oli, Olę, Olą, Olo; Magda: Magdy, Magdzie; Ewa: Ewie
    const stem = cut(name, 1);
    add(stem, ["a", "y", "i", "ę", "ą", "o", "e", "ie", "u"]);
    add(cut(stem, 1), SOFTEN[last(stem)] ?? []);
  } else if (low.endsWith("o")) {
    // Józio, Franio: Józia, Józiowi, Józiem
    add(cut(name, 1), ["a", "u", "owi", "em", "o"]);
  } else {
    let stems = [name];
    const end = last(low);
    const soft = SOFT_STEM[end];
    if (soft !== undefined) {
      stems = [cut(name, 1) + soft]; // Jaś: Jasia, Jasiowi, Jasiem, Jasiu
    } else if (low.endsWith("ek") && len(name) > 3) {
      stems = [name, `${cut(name, 2)}k`]; // Tomek: Tomka, Tomkiem (the e drops)
    }
    for (const stem of stems) {
      add(stem, ["a", "owi", "em", "iem", "u", "ie", "e", "y", "ów"]);
      add(cut(stem, 1), SOFTEN[last(stem)] ?? []);
    }
  }
  // English possessive and plural: "Kasia's", "the Kowalskis"
  for (const f of [...forms]) forms.add(`${f}'s`);
  forms.add(`${name}s`);
  return new Set([...forms].filter((f) => len(f) >= 2));
}

/** What the guard reads of a learner: a display name and a handle. */
export interface LearnerNames {
  handle: string;
  name?: string | null;
}

const stripPunct = (s: string): string => s.replace(/^[.,]+|[.,]+$/g, "");
const words = (s: string): string[] => s.split(/\s+/u).filter((w) => w !== "");

/** The names to guard for one learner: the display name, the handle and every pod member's. */
export function namesFor(learner?: LearnerNames | null, members: Iterable<string> = []): string[] {
  const names: string[] = [];
  if (learner) {
    if (learner.name) names.push(...words(learner.name));
    names.push(learner.handle);
  }
  for (const member of members) names.push(...words(member));
  // A one-letter token ("J.") is not a name worth a placeholder; it would eat every "a" and "i".
  const kept = names.map((n) => stripPunct(n.trim())).filter((n) => len(n) >= 2);
  return [...new Set(kept)];
}

// ---------------------------------------------------------------- matching ---

/** One character lowercased and without diacritics, still one character: Ł -> l, Ą -> a. */
function foldChar(ch: string): string {
  const base = ch === "ł" || ch === "Ł" ? "l" : (chars(ch.normalize("NFD"))[0] ?? ch);
  const low = base.toLowerCase();
  return len(low) === 1 ? low : base;
}

const fold = (s: string): string => chars(s).map(foldChar).join("");

/**
 * `text` as the matcher reads it, one code point each, and where each sits in `text`: each
 * character in its compatibility form (NFKC), format characters dropped. Only the view changes.
 */
function plainOf(text: readonly string[]): { plain: string[]; index: number[] } {
  const plain: string[] = [];
  const index: number[] = [];
  text.forEach((ch, i) => {
    if (isFormat(ch)) return;
    for (const c of chars(ch.normalize("NFKC"))) {
      plain.push(c);
      index.push(i);
    }
  });
  return { plain, index };
}

const escapeRegExp = (s: string): string => s.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");

interface NamesPattern {
  pattern: RegExp;
  /** Each folded form's name, in its dictionary form. */
  formOf: Map<string, string>;
}

function namesPattern(names: Iterable<string>): NamesPattern | null {
  const formOf = new Map<string, string>();
  for (const name of names) {
    for (const form of nameForms(name.normalize("NFC"))) {
      const folded = fold(form);
      if (!formOf.has(folded)) formOf.set(folded, name);
    }
  }
  if (formOf.size === 0) return null;
  // Longest first, so "Kasią" wins over "Kasi" and "Dawidowi" over "Dawid" (a stable sort).
  const alternatives = [...formOf.keys()].sort((a, b) => len(b) - len(a));
  return { pattern: new RegExp(`(?:${alternatives.map(escapeRegExp).join("|")})`, "gu"), formOf };
}

type Span = readonly [start: number, end: number, name: string];

/** Where `names` stand in `text` (code points, NFC): start, end, the name in dictionary form. */
function nameSpans(text: readonly string[], compiled: NamesPattern | null): Span[] {
  if (compiled === null) return [];
  const { pattern, formOf } = compiled;
  const { plain, index } = plainOf(text);
  // One UTF-16 unit per code point, so a match index is a code point index: a character outside
  // the BMP is never part of a name form, and U+FFFD stands in for it.
  const folded = plain.map((c) => (c.length === 1 ? foldChar(c) : "�")).join("");

  /** Whether plain[j] is a letter of the same word as plain[k], its neighbour. A dropped format
   * character between them breaks the word, and so does a symbol NFKC spelled as letters. */
  const letterNextTo = (j: number, k: number): boolean => {
    const at = index[j];
    const from = index[k];
    if (j < 0 || j >= plain.length || at === undefined || from === undefined) return false;
    if (Math.abs(at - from) > 1) return false;
    return isAlpha(plain[j]) && isAlpha(text[at]);
  };

  const spans: Span[] = [];
  let at = 0;
  for (;;) {
    pattern.lastIndex = at;
    const m = pattern.exec(folded);
    if (m === null) break;
    const start = m.index;
    let end = start + m[0].length;
    at = start + 1;
    if (letterNextTo(start - 1, start)) {
      // Inside a word ("Mikasia" is not Kasia), unless the name starts a capital after a
      // lowercase letter: glued on the end of another word, "NowakKasia", "kochamKasię".
      if (!(isUpper(plain[start]) && isLower(plain[start - 1]))) continue;
    }
    if (m[0].length >= PREFIX_LEN) {
      while (letterNextTo(end, end - 1)) end += 1; // the whole word: "Kasiunia", "KasiaNowak"
    } else if (letterNextTo(end, end - 1) && !isUpper(plain[end])) {
      continue; // "olej" is not Ola; "OlaNowak" is
    }
    const s = index[start];
    const e = index[end - 1];
    const name = formOf.get(m[0]);
    if (s !== undefined && e !== undefined && name !== undefined) spans.push([s, e + 1, name]);
    at = end;
  }
  return spans;
}

// ---------------------------------------------------------------- guard ------

/** Streamed text split into what can be restored now and a tail that may be half a placeholder. */
function holdBack(pending: string): [ready: string, rest: string] {
  const at = pending.lastIndexOf("[");
  if (at !== -1 && !pending.slice(at).includes("]") && len(pending.slice(at)) <= 12) {
    return [pending.slice(0, at), pending.slice(at)];
  }
  return [pending, ""];
}

/**
 * One guard over many texts: the instructions and every input of one request share a placeholder
 * table, so "Kasia" reads [NAME_1] in each of them, and the answer is restored with that table.
 * Pure: no file, no network.
 */
export class PromptGuard {
  readonly #names: NamesPattern | null;
  readonly #placeholderOf = new Map<string, string>();
  readonly #originalOf = new Map<string, string>();
  readonly #counts: Record<Kind, number> = { NAME: 0, EMAIL: 0, PHONE: 0 };

  constructor(names: Iterable<string> = []) {
    this.#names = namesPattern(names);
  }

  /** Placeholder -> original (a name in its dictionary form): only what this guard issued. */
  get replacements(): ReadonlyMap<string, string> {
    return this.#originalOf;
  }

  #placeholder(kind: Kind, key: string, original: string): string {
    const k = `${kind}\u0000${key}`;
    let found = this.#placeholderOf.get(k);
    if (found === undefined) {
      this.#counts[kind] += 1;
      found = `[${kind}_${this.#counts[kind]}]`;
      this.#placeholderOf.set(k, found);
      this.#originalOf.set(found, original);
    }
    return found;
  }

  /** `text` with learner names, emails and phone numbers replaced. */
  guard(raw: string): string {
    // NFC first, so a name typed as e + combining ogonek is the same letters as the composed one.
    let out = raw.normalize("NFC");
    out = out.replace(EMAIL_RE, (m) => this.#placeholder(EMAIL, m.toLowerCase(), m));
    out = out.replace(PHONE_RE, (m) => {
      const digits = m.replace(/\P{Nd}/gu, "");
      return len(digits) < MIN_PHONE_DIGITS ? m : this.#placeholder(PHONE, digits, m);
    });
    const text = chars(out);
    const pieces: string[] = [];
    let done = 0;
    for (const [start, end, base] of nameSpans(text, this.#names)) {
      pieces.push(
        text.slice(done, start).join(""),
        this.#placeholder(NAME, base.toLowerCase(), base),
      );
      done = end;
    }
    pieces.push(text.slice(done).join(""));
    return pieces.join("");
  }

  /** Put back the originals, and only the placeholders this guard issued. */
  restore(reply: string): string {
    return reply.replace(PLACEHOLDER, (m) => this.#originalOf.get(m) ?? m);
  }

  /** `restore` over streamed text, holding back a tail that may be half a placeholder. */
  restoreStream(): { push(chunk: string): string; flush(): string } {
    let pending = "";
    return {
      push: (chunk: string) => {
        let ready: string;
        [ready, pending] = holdBack(pending + chunk);
        return ready === "" ? "" : this.restore(ready);
      },
      flush: () => {
        const rest = pending;
        pending = "";
        return rest === "" ? "" : this.restore(rest);
      },
    };
  }
}

/** A prompt the guard has seen: its text with placeholders, and the map to undo them. */
export interface GuardedPrompt {
  readonly text: string;
  readonly replacements: ReadonlyMap<string, string>;
}

const sealed = new WeakSet<GuardedPrompt>();

/** `jw.pii.guard`: one text, its own placeholder table, sealed. */
export function guard(text: string, options: { names?: Iterable<string> } = {}): GuardedPrompt {
  const g = new PromptGuard(options.names ?? []);
  const prompt: GuardedPrompt = Object.freeze({
    text: g.guard(text),
    replacements: g.replacements,
  });
  sealed.add(prompt);
  return prompt;
}

/** Whether `guard` built this prompt: a hand-made `{ text, replacements }` is not sealed. */
export function isSealed(prompt: GuardedPrompt): boolean {
  return sealed.has(prompt);
}

/** Put the originals back into a model's reply, after it has come back. */
export function restore(reply: string, prompt: GuardedPrompt): string {
  return reply.replace(PLACEHOLDER, (m) => prompt.replacements.get(m) ?? m);
}

/** `restore` over streamed chunks, holding back a tail that may be half a placeholder. */
export function* restoreStream(chunks: Iterable<string>, prompt: GuardedPrompt): Generator<string> {
  let pending = "";
  for (const chunk of chunks) {
    let ready: string;
    [ready, pending] = holdBack(pending + chunk);
    if (ready !== "") yield restore(ready, prompt);
  }
  if (pending !== "") yield restore(pending, prompt);
}

/** The name forms of `names` still present in `text`: empty when the guard did its job. */
export function leaks(text: string, names: Iterable<string>): string[] {
  const t = chars(text.normalize("NFC"));
  return nameSpans(t, namesPattern(names)).map(([s, e]) => t.slice(s, e).join(""));
}
