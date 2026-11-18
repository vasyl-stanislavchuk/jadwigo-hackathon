// @vitest-environment happy-dom
/**
 * The parent's settings pages (handoff dl-uukj.47 §6): the account says when it was made and signs
 * out, the language page switches the parent pages between Polski and English, and the AI consent
 * page gives and withdraws the pod's consent with a switch, saying what changes.
 */

import type { Me } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pickLanguage } from "../../nav/language.ts";
import { SettingsPage } from "./SettingsPage.tsx";

vi.mock("../../nav/language.ts", async (original) => ({
  ...(await original<typeof import("../../nav/language.ts")>()),
  pickLanguage: vi.fn(),
}));

afterEach(cleanup);

const me = (consentAt: string | null): Me =>
  ({
    account: { id: "acc_a", created_at: "2026-10-01T08:00:00Z" },
    member: null,
    pod: { id: "pod_a", ai_consent_at: consentAt },
    learners: [],
  }) as unknown as Me;

describe("Konto", () => {
  it("says when the account was made, and signs out", () => {
    const out = vi.fn();
    render(
      <SettingsPage
        section="account"
        language="pl"
        me={me(null)}
        onSignOut={out}
        onConsent={null}
      />,
    );
    expect(screen.getByRole("heading", { name: "Konto" })).toBeDefined();
    expect(screen.getByText("Konto założone 1 października 2026.")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Wyloguj się" }));
    expect(out).toHaveBeenCalledOnce();
  });
});

describe("Język", () => {
  it("offers Polski and English, the page's own picked, and switches", () => {
    render(
      <SettingsPage
        section="language"
        language="pl"
        me={me(null)}
        onSignOut={() => {}}
        onConsent={null}
      />,
    );
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toEqual(["Polski", "English"]);
    expect(radios[0]?.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "English" }));
    expect(pickLanguage).toHaveBeenCalledWith("en");
  });
});

describe("Zgoda na AI", () => {
  it("shows the consent as on with its date, and withdraws it", async () => {
    const consent = vi.fn(async () => {});
    render(
      <SettingsPage
        section="ai"
        language="pl"
        me={me("2026-10-02T08:00:00Z")}
        onSignOut={() => {}}
        onConsent={consent}
      />,
    );
    const toggle = screen.getByRole("switch", { name: "Zgoda na Jadwigo AI" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Zgoda dana 2 października 2026.")).toBeDefined();
    await act(async () => fireEvent.click(toggle));
    expect(consent).toHaveBeenCalledWith(false);
  });

  it("says what is off without it, gives it, and says so when the save fails", async () => {
    const consent = vi.fn(async () => {
      throw new Error("offline");
    });
    render(
      <SettingsPage
        section="ai"
        language="pl"
        me={me(null)}
        onSignOut={() => {}}
        onConsent={consent}
      />,
    );
    const toggle = screen.getByRole("switch", { name: "Zgoda na Jadwigo AI" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(/Bez zgody Jadwigo AI nie przygotuje nowej lekcji/)).toBeDefined();
    await act(async () => fireEvent.click(toggle));
    expect(consent).toHaveBeenCalledWith(true);
    expect(screen.getByRole("alert").textContent).toContain("Nie udało się zapisać zgody");
  });

  it("keeps the switch off limits where the page has no route to the consent", () => {
    render(
      <SettingsPage
        section="ai"
        language="pl"
        me={me(null)}
        onSignOut={() => {}}
        onConsent={null}
      />,
    );
    expect(screen.getByRole("switch").hasAttribute("disabled")).toBe(true);
  });
});
