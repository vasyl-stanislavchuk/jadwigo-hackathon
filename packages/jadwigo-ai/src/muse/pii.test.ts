import { describe, expect, it } from "vitest";
import {
  guard,
  isSealed,
  leaks,
  nameForms,
  namesFor,
  PromptGuard,
  restore,
  restoreStream,
} from "./pii.ts";

/**
 * The port of `jw.pii` passes every case of `apps/cli/tests/test_pii.py` (the explanation-prompt
 * cases read `jw.explain`, which has no TypeScript side; `muse/tiers.test.ts` covers a whole
 * request instead), plus the steward's list from the review of #408 on dl-z5ja.18.
 */

/** `text` as a reader sees it: no format characters, compatibility forms, lowercase, no marks. */
function asRead(text: string): string {
  const visible = Array.from(text)
    .filter((ch) => !/^\p{Cf}$/u.test(ch))
    .join("");
  return visible.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "");
}

describe("names, as test_pii.py has them", () => {
  it.each([
    ["Kasia", ["Kasia", "Kasi", "Kasię", "Kasią", "Kasiu", "Kasio"]],
    ["Dawid", ["Dawida", "Dawidowi", "Dawidem", "Dawidzie"]],
    ["Tomek", ["Tomka", "Tomkowi", "Tomkiem", "Tomku"]],
    ["Jaś", ["Jasia", "Jasiowi", "Jasiem", "Jasiu"]],
    ["Magda", ["Magdy", "Magdę", "Magdą", "Magdzie", "Magdo"]],
    ["Michał", ["Michała", "Michałowi", "Michałem", "Michale"]],
    ["Julia", ["Julii", "Julię", "Julią"]],
  ])("%s takes its Polish forms", (name, forms) => {
    const all = nameForms(name);
    for (const f of forms) expect(all).toContain(f);
  });

  it.each([
    "Kasia nie rozumie dodawania. Pomóż Kasi, bo Kasię to martwi.",
    "Wczoraj z Kasią liczyliśmy do 100. Kasiu, spróbuj jeszcze raz!",
    "Dawid i Tomek grali. Daj to Dawidowi, a nie Tomkowi. Myślę o Dawidzie.",
    "kasia (małą literą) też jest imieniem.",
    "Kasia's teacher says she rushes. Can Peter help Kasia?",
    "Tell Peter that Tomek is coming.",
  ])("replaces the names in %s", (text) => {
    const names = ["Kasia", "Dawid", "Tomek", "Peter"];
    const g = guard(text, { names });
    expect(leaks(g.text, names)).toEqual([]);
    expect(g.text).toContain("[NAME_1]");
  });

  it("gives one person one placeholder, and restore gives the name back", () => {
    const g = guard("Kasia liczy. Pomóż Kasi. Dawid patrzy.", { names: ["Kasia", "Dawid"] });
    expect(g.text).toBe("[NAME_1] liczy. Pomóż [NAME_1]. [NAME_2] patrzy.");
    expect(restore("Brawo, [NAME_1] i [NAME_2]!", g)).toBe("Brawo, Kasia i Dawid!");
  });

  it("keeps words that only start like a name", () => {
    const g = guard("Kasa w sklepie, kasztan, Mikasia i olej.", { names: ["Kasia", "Ola"] });
    expect(g.text).toBe("Kasa w sklepie, kasztan, Mikasia i olej.");
  });

  it("hides a word that starts with a long name form whole", () => {
    expect(guard("Kasiopeja na niebie.", { names: ["Kasia"] }).text).toBe("[NAME_1] na niebie.");
  });

  it.each([
    [["Michał"], "Michal nie umie mnożyć.", "Michal"],
    [["Łucja"], "Lucja liczy.", "Lucja"],
    [["Kasia"], "Pomóż Kasie.", "Kasie"],
    [["Kasia"], "Kasię martwi dzielenie.".normalize("NFD"), "Kasi"],
    [["Kasia"], "KasiaNowak zrobiła to sama.", "Kasia"],
    [["Kasia"], "login kasia_k", "kasia"],
    [["Kasia"], "Kasiaaa!!!", "Kasia"],
    [["Kasia"], "Kasiunia i Kasieńka.", "Kasi"],
    [["Kuba"], "Z Kubusiem.", "Kub"],
    [["Ola"], "OlaNowak", "Ola"],
    [["Kasia"], "NowakKasia kochamKasię", "Kasi"],
    [["Kasia"], "kot​kasia liczy", "kasi"],
    [["Kasia"], "Ala­kasia", "kasi"],
    [["Kasia"], "ⓚkasia", "kasi"],
    [["Kasia"], "™kasia", "kasi"],
    [["Ola"], "Ola​i Kasia", "ola"],
    [["Ola"], "Ola­nie", "ola"],
    [["Ola"], "⁠ola⁠i", "ola"],
    [["Ola"], "Ola㎏", "ola"],
    [["Kasia"], "Ｋａｓｉａ liczy.", "Kasi"],
    [["Kasia"], "\u{1d40a}\u{1d41a}\u{1d42c}\u{1d422}\u{1d41a} liczy.", "Kasi"],
    [["Kasia"], "Ka­sia liczy.", "Kasi"],
    [["Kasia"], "Ka​sia liczy.", "Kasi"],
    [["Kasia"], "Ka‍si⁠a liczy.", "Kasi"],
  ])("lets no spelling of %j through: %j", (names, text, gone) => {
    const out = guard(text, { names }).text;
    expect(asRead(out)).not.toContain(gone.toLowerCase());
    expect(out).toContain("[NAME_1]");
  });

  it("takes a name glued after a lowercase word, but not one inside a word", () => {
    const g = guard("NowakKasia kochamKasię, Mikasia i MIKASIA.", { names: ["Kasia"] });
    expect(g.text).toBe("Nowak[NAME_1] kocham[NAME_1], Mikasia i MIKASIA.");
  });

  it("leaves the text around a name in its own characters", () => {
    const text = "Kasia: 5² + ½ = ? Zada­nie, １２.";
    expect(guard(text, { names: ["Kasia"] }).text).toBe("[NAME_1]: 5² + ½ = ? Zada­nie, １２.");
  });
});

describe("emails and phones, as test_pii.py has them", () => {
  it.each([
    "Mój mail to anna.kowalska+szkola@poczta.onet.pl, proszę pisać.",
    "Write to the parent at j.smith@example.co.uk any time.",
  ])("replaces the email in %s", (text) => {
    const g = guard(text);
    expect(g.text).not.toContain("@");
    expect(g.text).toContain("[EMAIL_1]");
    expect(restore(g.text, g)).toBe(text);
  });

  it.each([
    "+48 600 700 800",
    "600-700-800",
    "600700800",
    "(22) 123 45 67",
    "+44 20 7946 0958",
    "(555) 123-4567",
  ])("replaces the phone %s", (phone) => {
    for (const text of [
      `Zadzwoń pod ${phone} po lekcji.`,
      `Call me on ${phone} after the lesson.`,
    ]) {
      const g = guard(text);
      expect(g.text).toContain("[PHONE_1]");
      expect(restore(g.text, g)).toBe(text);
    }
  });

  it.each([
    "Ile to 27 + 45?",
    "Dodawanie do 100 i do 1000.",
    "W 2026 roku, 3 klasa.",
    "345 + 278 = 623",
  ])("reads %s as maths, not a phone", (text) => {
    expect(guard(text).text).toBe(text);
  });
});

describe("the seal, the stream and the learner, as test_pii.py has them", () => {
  it("seals only what guard built", () => {
    expect(isSealed(guard("x"))).toBe(true);
    expect(isSealed({ text: "Kasia", replacements: new Map() })).toBe(false);
  });

  it("restores a placeholder split across streamed chunks", () => {
    const g = guard("Kasia", { names: ["Kasia"] });
    const chunks = ["Brawo, [NA", "ME_1]! Dalej", ", [NAME_1]."];
    expect([...restoreStream(chunks, g)].join("")).toBe("Brawo, Kasia! Dalej, Kasia.");
  });

  it("takes the learner's names and the pod's", () => {
    expect(namesFor({ handle: "kasia", name: "Kasia Nowak" }, ["Dawid Nowak", "J."])).toEqual([
      "Kasia",
      "Nowak",
      "kasia",
      "Dawid",
    ]);
  });
});

describe("the steward's list (review of #408)", () => {
  it("replaces every Polish case of Kasia, case-insensitively, and Lucja for Łucja", () => {
    const names = ["Kasia", "Łucja"];
    const g = guard("Kasia is in grade 1. Kasi trudno, a Lucja i KASIĄ też. Brawo, Kasiu!", {
      names,
    });
    expect(g.text).toBe(
      "[NAME_1] is in grade 1. [NAME_1] trudno, a [NAME_2] i [NAME_1] też. Brawo, [NAME_1]!",
    );
    expect(leaks(g.text, names)).toEqual([]);
  });

  it("matches on word boundaries: Ola is not in Olaf, szkoła or olej", () => {
    expect(guard("Olaf idzie do szkoła, olej.", { names: ["Ola"] }).text).toBe(
      "Olaf idzie do szkoła, olej.",
    );
    expect(guard("Ola idzie do szkoły.", { names: ["Ola"] }).text).toBe(
      "[NAME_1] idzie do szkoły.",
    );
  });

  it("keeps overlapping names apart: Ola and Olaf", () => {
    const g = guard("Ola i Olaf. Olafowi pomaga Ola.", { names: ["Ola", "Olaf"] });
    expect(g.text).toBe("[NAME_1] i [NAME_2]. [NAME_2] pomaga [NAME_1].");
    expect(restore(g.text, g)).toBe("Ola i Olaf. Olaf pomaga Ola.");
  });

  it("restores only the placeholders the guard issued", () => {
    const g = new PromptGuard(["Kasia"]);
    expect(g.guard("Kasia liczy.")).toBe("[NAME_1] liczy.");
    expect(g.restore("[NAME_1], [NAME_2], [EMAIL_1] and [NAME_1x]")).toBe(
      "Kasia, [NAME_2], [EMAIL_1] and [NAME_1x]",
    );
  });

  it("shares one placeholder table across the texts of one request", () => {
    const g = new PromptGuard(["Kasia", "Dawid"]);
    expect(g.guard("The parent adds: Dawid helps.")).toBe("The parent adds: [NAME_1] helps.");
    expect(g.guard("Kasia i Dawid.")).toBe("[NAME_2] i [NAME_1].");
    expect([...g.replacements]).toEqual([
      ["[NAME_1]", "Dawid"],
      ["[NAME_2]", "Kasia"],
    ]);
  });

  it("restores a stream with the request's table", () => {
    const g = new PromptGuard(["Kasia"]);
    g.guard("Kasia");
    const s = g.restoreStream();
    expect([s.push("Brawo, [NA"), s.push("ME_1]!"), s.flush()].join("")).toBe("Brawo, Kasia!");
  });
});
