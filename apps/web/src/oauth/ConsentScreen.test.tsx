/**
 * The OAuth consent page against a fake of supabase-js's three consent calls and of the sign-in
 * (no network; the OAuth server is still off, dl-1u6fn.6): a signed-out parent signs in on the
 * page with the id kept, sees the app's name, its host and that the children's data goes to it,
 * and Allow or Deny sends the tab to the app's redirect URL.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Auth } from "../parent/auth.ts";
import { type ConsentApi, ConsentScreen } from "./ConsentScreen.tsx";

const ID = "8d3c5a1e-0b2f-4c6d-9e7a-1f2b3c4d5e6f";
const QUERY = new URLSearchParams({ authorization_id: ID });
const DETAILS = {
  authorization_id: ID,
  redirect_uri: "https://claude.ai/api/mcp/auth_callback",
  client: { id: "c1", name: "Claude", uri: "", logo_uri: "" },
  user: { id: "u1", email: "rodzic@example.com" },
  scope: "openid email",
};
const BACK = "https://claude.ai/api/mcp/auth_callback?code=abc&state=xyz";
const DENIED = "https://claude.ai/api/mcp/auth_callback?error=access_denied&state=xyz";

function fakeAuth(signedIn: boolean): Auth {
  let inside = signedIn;
  return {
    token: async () => (inside ? "header.payload.signature" : null),
    refresh: async () => null,
    sendCode: vi.fn(async () => {}),
    verifyCode: vi.fn(async (_email: string, code: string) => {
      inside = code === "123456";
      return inside;
    }),
    providers: () => [],
    enabledProviders: async () => [],
    handoffProviders: async () => [],
    signInWith: vi.fn(async () => {}),
    completeRedirect: async () => "none",
    signOut: vi.fn(async () => {
      inside = false;
    }),
  };
}

function fakeOAuth(details: object = DETAILS) {
  return {
    getAuthorizationDetails: vi.fn(async () => ({ data: details, error: null })),
    approveAuthorization: vi.fn(async () => ({ data: { redirect_url: BACK }, error: null })),
    denyAuthorization: vi.fn(async () => ({ data: { redirect_url: DENIED }, error: null })),
  } as unknown as ConsentApi & Record<keyof ConsentApi, ReturnType<typeof vi.fn>>;
}

/** Signs in on the page's own sign-in with the email code. */
async function signIn(): Promise<void> {
  await screen.findByText("Wyślij kod");
  fireEvent.change(document.querySelector("[data-email]") as Element, {
    target: { value: "rodzic@example.com" },
  });
  fireEvent.submit(document.querySelector("[data-email-step]") as Element);
  await screen.findByText("Zaloguj się");
  fireEvent.change(document.querySelector("[data-code]") as Element, {
    target: { value: "123456" },
  });
  fireEvent.submit(document.querySelector("[data-code-step]") as Element);
}

const press = (selector: string): void => {
  const button = document.querySelector(selector);
  if (!(button instanceof HTMLElement)) throw new Error(`no ${selector}`);
  fireEvent.click(button);
};

afterEach(cleanup);

describe("ConsentScreen", () => {
  it("signs a parent in on the page, names the app and its host, and approves", async () => {
    const oauth = fakeOAuth();
    const go = vi.fn();
    render(
      <ConsentScreen language="pl" query={QUERY} auth={fakeAuth(false)} oauth={oauth} go={go} />,
    );

    await screen.findByText("Wyślij kod");
    expect(oauth.getAuthorizationDetails).not.toHaveBeenCalled();
    await signIn();

    await screen.findByRole("heading", { name: "Połącz Claude z Jadwigo" });
    expect(oauth.getAuthorizationDetails).toHaveBeenCalledWith(ID);
    expect(document.querySelector("[data-consent-host]")?.textContent).toContain("claude.ai");
    expect(document.querySelector("[data-consent-data]")?.textContent).toBe(
      "Claude dostanie imiona Twoich dzieci, ich lekcje i wyniki.",
    );
    expect(document.querySelector("[data-consent-as]")?.textContent).toContain(
      "Zalogowano jako rodzic@example.com.",
    );

    press("[data-consent-approve]");
    await waitFor(() => expect(go).toHaveBeenCalledWith(BACK));
    expect(oauth.approveAuthorization).toHaveBeenCalledWith(ID, { skipBrowserRedirect: true });
    expect(oauth.denyAuthorization).not.toHaveBeenCalled();
  });

  it("denies, in English", async () => {
    const oauth = fakeOAuth();
    const go = vi.fn();
    render(
      <ConsentScreen language="en" query={QUERY} auth={fakeAuth(true)} oauth={oauth} go={go} />,
    );

    await screen.findByText("Claude will get your children's names, lessons and results.");
    press("[data-consent-deny]");
    await waitFor(() => expect(go).toHaveBeenCalledWith(DENIED));
    expect(oauth.denyAuthorization).toHaveBeenCalledWith(ID, { skipBrowserRedirect: true });
    expect(oauth.approveAuthorization).not.toHaveBeenCalled();
  });

  it("goes straight on when the parent already consented, once they signed in on the page", async () => {
    const auth = fakeAuth(false);
    const go = vi.fn();
    render(
      <ConsentScreen
        language="pl"
        query={QUERY}
        auth={auth}
        oauth={fakeOAuth({ redirect_url: BACK })}
        go={go}
      />,
    );
    await signIn();
    await waitFor(() => expect(go).toHaveBeenCalledWith(BACK));
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("signs a session saved before out when the app was already approved, so nobody goes on as someone else", async () => {
    const auth = fakeAuth(true);
    const oauth = fakeOAuth({ redirect_url: BACK });
    const go = vi.fn();
    render(<ConsentScreen language="pl" query={QUERY} auth={auth} oauth={oauth} go={go} />);
    await screen.findByText("Wyślij kod");
    expect(auth.signOut).toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();

    await signIn();
    await waitFor(() => expect(go).toHaveBeenCalledWith(BACK));
    expect(oauth.getAuthorizationDetails).toHaveBeenLastCalledWith(ID);
  });

  it("shows who approves, and Not you signs out to the sign-in with the request kept", async () => {
    const auth = fakeAuth(true);
    const oauth = fakeOAuth();
    render(<ConsentScreen language="pl" query={QUERY} auth={auth} oauth={oauth} go={vi.fn()} />);
    await screen.findByText("Zalogowano jako rodzic@example.com.", { exact: false });

    press("[data-consent-not-you]");
    await screen.findByText("Wyślij kod");
    expect(auth.signOut).toHaveBeenCalled();
    expect(oauth.approveAuthorization).not.toHaveBeenCalled();

    await signIn();
    await screen.findByRole("heading", { name: "Połącz Claude z Jadwigo" });
    expect(oauth.getAuthorizationDetails).toHaveBeenCalledTimes(2);
    expect(oauth.getAuthorizationDetails).toHaveBeenLastCalledWith(ID);
  });

  it("says it could not connect when the request is gone or has no id", async () => {
    const oauth = fakeOAuth();
    oauth.getAuthorizationDetails.mockResolvedValueOnce({ data: null, error: new Error("gone") });
    render(<ConsentScreen language="pl" query={QUERY} auth={fakeAuth(true)} oauth={oauth} />);
    expect((await screen.findByRole("alert")).textContent).toContain("Nie udało się połączyć");
    cleanup();

    render(
      <ConsentScreen
        language="pl"
        query={new URLSearchParams()}
        auth={fakeAuth(true)}
        oauth={fakeOAuth()}
      />,
    );
    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  it("says sign-in is off when the build has no Supabase project", () => {
    render(<ConsentScreen language="pl" query={QUERY} auth={null} oauth={null} />);
    expect(screen.getByText("Logowanie jest jeszcze wyłączone.")).toBeTruthy();
  });
});
