import { AuthEmailAction, Language } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { renderAuthEmail } from "./render.ts";

const TOKEN = "482915";

describe("renderAuthEmail", () => {
  const cases = AuthEmailAction.options.flatMap((action) =>
    Language.options.map((language) => [action, language] as const),
  );

  it.each(cases)(
    "%s in %s carries the 6-digit code in the html and the text",
    async (action, language) => {
      const mail = await renderAuthEmail(action, language, TOKEN);
      expect(mail.html).toContain(TOKEN);
      expect(mail.text).toContain(TOKEN);
      expect(mail.html).toContain(`lang="${language}"`);
      expect(mail.subject).not.toBe("");
      // No link in the mail: the code goes into the tab that asked for it.
      expect(mail.html).not.toMatch(/<a\s/);
    },
  );

  it("gives each kind its own subject in each language", async () => {
    for (const language of Language.options) {
      const subjects = await Promise.all(
        AuthEmailAction.options.map(
          async (a) => (await renderAuthEmail(a, language, TOKEN)).subject,
        ),
      );
      expect(new Set(subjects).size).toBe(AuthEmailAction.options.length);
    }
  });

  it("speaks the language it is asked for", async () => {
    const pl = await renderAuthEmail("signup", "pl", TOKEN);
    const en = await renderAuthEmail("signup", "en", TOKEN);
    expect(pl.subject).toBe("Twój kod do Jadwigo");
    expect(en.subject).toBe("Your Jadwigo code");
    expect(pl.text).toContain("Jeśli to nie Ty");
    expect(en.text).toContain("If this wasn't you");
  });
});
