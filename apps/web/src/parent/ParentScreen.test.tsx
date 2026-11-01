/**
 * The parent's screens against doubles of the sign-in and the API (no network): the email code
 * signs in, the first sign-in makes the account, a child is added, the tab's attempt is claimed
 * for them and forgotten, and the parent home lists it, each lesson a row of outcome tiles. Google
 * and Facebook show only when the build turns them on, and a return from either signs in or says
 * why it could not.
 */

import { ApiError, type ParentClient } from "@jadwigo/api-client";
import {
  AccountId,
  AssignmentId,
  AttemptId,
  type Claim,
  type LearnerAttempts,
  LearnerId,
  type LearnerSnapshot,
  type Me,
} from "@jadwigo/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setPodLanguage, useScreenLanguage } from "../nav/language.ts";
import { storedAttempt } from "../play/storedAttempt.ts";
import { type Auth, type Provider, type RedirectOutcome, returnOf, supabaseAuth } from "./auth.ts";
import { result, twin } from "./overview/fixtures.ts";
import { ParentScreen } from "./ParentScreen.tsx";

const AT = "2026-10-28T14:02:06.274Z";
const POD = "pod_6et2fhbnwvb45aw9atcfzs33za";
const ASSIGNMENT = AssignmentId.parse("asg_0ectzj2evqb95a3v1v6wewjzy3");
const ATTEMPT = AttemptId.parse("att_43007b83dp9w2tnfjxhha74cyq");
const LEARNER = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
const ACCOUNT = AccountId.parse("acc_7qre3atahx8cpak6xbjtz73var");

const NOBODY: Me = { account: null, member: null, pod: null, learners: [] };
const pod = { id: POD, name: "Dom", language: "pl", created_at: AT };
const account = {
  id: ACCOUNT,
  pod_id: POD,
  sub: "6f1c2a3e-1b2c-4d5e-8f90-123456789abc",
  created_at: AT,
};
const member = {
  id: "mem_2h4m8gyw0fb1cvz2nkqw0px8fq",
  pod_id: POD,
  account_id: ACCOUNT,
  role: "parent",
  created_at: AT,
};
const snapshot = {
  learner: {
    id: LEARNER,
    pod_id: POD,
    handle: "ola",
    first_name: "Ola",
    age_group: null,
    created_at: AT,
  },
  goals: [],
} as unknown as LearnerSnapshot;
const me = (learners: LearnerSnapshot[]): Me =>
  ({ account, member, pod, learners }) as unknown as Me;

function signedOutAuth(
  providers: readonly Provider[] = [],
  /** What the project's settings turn on: the build's list by default, or a failed read. */
  enabled: readonly Provider[] | "unreadable" = providers,
): Auth & { signedIn: boolean } {
  const auth = {
    signedIn: false,
    token: async () => (auth.signedIn ? "header.payload.signature" : null),
    refresh: async () => (auth.signedIn ? "header.payload.signature" : null),
    sendCode: vi.fn(async () => {}),
    verifyCode: vi.fn(async (_email: string, code: string) => {
      auth.signedIn = code === "123456";
      return auth.signedIn;
    }),
    providers: () => providers,
    enabledProviders: vi.fn(async () => {
      if (enabled === "unreadable") throw new Error("settings 503");
      return providers.filter((provider) => enabled.includes(provider));
    }),
    signInWith: vi.fn(async (_provider: Provider, _returnTo: string) => {}),
    // A provider's return as auth.ts reads it: a code signs in, an error says which.
    completeRedirect: vi.fn(async (url: URL): Promise<RedirectOutcome> => {
      const back = returnOf(url);
      if (back.kind === "code") auth.signedIn = true;
      if (back.kind === "error")
        return back.description.includes("Error getting user email") ? "no-email" : "failed";
      return back.kind === "code" ? "signed-in" : "none";
    }),
    signOut: async () => {
      auth.signedIn = false;
    },
  };
  return auth;
}

const refused = (): never => {
  throw new Error("not called in this test");
};

function client(changes: Partial<ParentClient>): ParentClient {
  return {
    getMe: refused,
    createAccount: refused,
    createLearner: refused,
    claimAttempt: refused,
    getLearnerAttempts: async () => ({ learner: snapshot.learner, attempts: [] }),
    getParentReview: refused,
    getAssignmentAttempts: refused,
    ...changes,
  };
}

const type = (selector: string, value: string): void => {
  const field = document.querySelector(selector);
  if (field === null) throw new Error(`no ${selector}`);
  fireEvent.change(field, { target: { value } });
};
const press = async (selector: string): Promise<void> => {
  const target = document.querySelector(selector);
  if (target === null) throw new Error(`no ${selector}`);
  await act(async () => fireEvent.click(target));
};

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/parent");
});
afterEach(() => {
  cleanup();
  act(() => setPodLanguage(null));
  vi.restoreAllMocks();
});

/** The parent's screens with the language wired as App wires it (nav/language.ts). */
function Wired(props: { auth: Auth; client: ParentClient }) {
  const query = new URLSearchParams(window.location.search);
  return <ParentScreen language={useScreenLanguage(query)} query={query} {...props} />;
}

describe("ParentScreen", () => {
  it("says sign-in is off when the build has no Supabase project", () => {
    render(<ParentScreen language="pl" query={new URLSearchParams()} auth={null} />);
    expect(screen.getByText("Logowanie jest jeszcze wyłączone.")).toBeTruthy();
  });

  it("signs in with the email code, makes the account, adds a child and keeps the tab's attempt", async () => {
    storedAttempt.set(ASSIGNMENT, ATTEMPT);
    const auth = signedOutAuth();
    let learners: LearnerSnapshot[] = [];
    const claim: Claim = {
      attempt_id: ATTEMPT,
      learner_id: LEARNER,
      claimed_by: ACCOUNT,
      claimed_at: AT,
    } as Claim;
    const api = client({
      getMe: vi.fn(async () => (learners.length === 0 && auth.signedIn ? NOBODY : me(learners))),
      createAccount: vi.fn(async () => me([])),
      createLearner: vi.fn(async () => {
        learners = [snapshot];
        return snapshot;
      }),
      claimAttempt: vi.fn(async () => claim),
    });
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams(`claim=${ASSIGNMENT}`)}
        auth={auth}
        client={api}
      />,
    );

    await screen.findByText("Wyślij kod");
    type("[data-email]", "rodzic@example.com");
    await press("[data-send-code]");
    expect(auth.sendCode).toHaveBeenCalledWith("rodzic@example.com");

    type("[data-code]", "111111");
    await press("[data-sign-in]");
    expect(await screen.findByRole("alert")).toBeTruthy();

    type("[data-code]", "123456");
    await press("[data-sign-in]");
    await screen.findByText("Imię dziecka");
    expect(api.createAccount).toHaveBeenCalledWith({ language: "pl" });

    type("[data-first-name]", " Ola ");
    await press("[data-add]");
    // The child's card on the home, and the child's row in the sidebar.
    await screen.findByRole("heading", { name: "Ola" });
    expect(document.querySelector(`[data-child-row="${LEARNER}"]`)?.textContent).toContain("Ola");
    expect(api.createLearner).toHaveBeenCalledWith({ first_name: "Ola" });
    expect(api.claimAttempt).toHaveBeenCalledWith(ATTEMPT, { learner_id: LEARNER });
    expect(storedAttempt.get(ASSIGNMENT)).toBeNull();
    expect(window.location.search).not.toContain("claim");
  });

  it("sends the language the parent picks at sign-in as the pod's, and the screens follow it", async () => {
    const auth = signedOutAuth();
    const api = client({
      getMe: vi.fn(async () => (auth.signedIn ? NOBODY : me([]))),
      createAccount: vi.fn(async () => me([])),
    });
    render(<Wired auth={auth} client={api} />);

    await screen.findByText("Wyślij kod");
    await press('[data-language-pick] [role="radio"][value="en"]');
    await screen.findByText("Send the code");
    type("[data-email]", "rodzic@example.com");
    await press("[data-send-code]");
    type("[data-code]", "123456");
    await press("[data-sign-in]");
    // A child is never a gate (decision dl-xo0q): the app opens on "Lessons / New lesson".
    await screen.findByRole("navigation", { name: "Where you are" });
    expect(screen.getByText("New lesson").getAttribute("aria-current")).toBe("page");
    expect(document.querySelector("[data-first-name]")).toBeNull();
    expect(api.createAccount).toHaveBeenCalledWith({ language: "en" });
  });

  it("speaks the pod's language once /me says it, unless the parent picked another", async () => {
    const auth = signedOutAuth();
    auth.signedIn = true;
    const english = { ...me([snapshot]), pod: { ...pod, language: "en" } } as unknown as Me;
    const api = client({ getMe: async () => english });
    render(<Wired auth={auth} client={api} />);
    await screen.findByRole("button", { name: "Add a child" });
    // The language lives in the account menu at the sidebar's foot.
    await press("[data-account]");
    await press('[data-language-pick] [role="radio"][value="pl"]');
    await screen.findByRole("button", { name: "Dodaj dziecko" });
  });

  it("asks whose lesson it was when the pod has a child, and says so when the attempt is already kept", async () => {
    storedAttempt.set(ASSIGNMENT, ATTEMPT);
    const auth = signedOutAuth();
    auth.signedIn = true;
    const api = client({
      getMe: async () => me([snapshot]),
      claimAttempt: vi.fn(async () => {
        throw new ApiError("claimed", 409, "AttemptClaimed");
      }),
    });
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams(`claim=${ASSIGNMENT}`)}
        auth={auth}
        client={api}
      />,
    );
    await screen.findByText("Czyja to była lekcja?");
    await press(`[data-learner="${LEARNER}"]`);
    expect(await screen.findByText("Ta lekcja jest już zapisana na innym koncie.")).toBeTruthy();
    expect(storedAttempt.get(ASSIGNMENT)).toBeNull();
  });

  it("says gently that a try-out lesson is not saved, and forgets it", async () => {
    storedAttempt.set(ASSIGNMENT, ATTEMPT);
    const auth = signedOutAuth();
    auth.signedIn = true;
    const api = client({
      getMe: async () => me([snapshot]),
      claimAttempt: async () => {
        throw new ApiError("preview", 409, "AttemptPreview");
      },
    });
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams(`claim=${ASSIGNMENT}`)}
        auth={auth}
        client={api}
      />,
    );
    await screen.findByText("Czyja to była lekcja?");
    await press(`[data-learner="${LEARNER}"]`);
    expect(
      await screen.findByText("Ta lekcja była na próbę, więc nie zapisujemy jej."),
    ).toBeTruthy();
    expect(storedAttempt.get(ASSIGNMENT)).toBeNull();
  });

  it("keeps the tab's attempt when the claim fails for another reason", async () => {
    storedAttempt.set(ASSIGNMENT, ATTEMPT);
    const auth = signedOutAuth();
    auth.signedIn = true;
    const api = client({
      getMe: async () => me([snapshot]),
      claimAttempt: async () => {
        throw new Error("offline");
      },
    });
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams(`claim=${ASSIGNMENT}`)}
        auth={auth}
        client={api}
      />,
    );
    await screen.findByText("Czyja to była lekcja?");
    await press(`[data-learner="${LEARNER}"]`);
    expect(document.querySelector("[data-failed]")).not.toBeNull();
    expect(storedAttempt.get(ASSIGNMENT)).toBe(ATTEMPT);
  });

  it("tells the adult, in the adult's words, that the home did not load", async () => {
    const auth = signedOutAuth();
    auth.signedIn = true;
    const api = client({
      getMe: async () => {
        throw new Error("offline");
      },
    });
    render(<ParentScreen language="pl" query={new URLSearchParams()} auth={auth} client={api} />);
    const failed = await screen.findByRole("alert");
    expect(failed.hasAttribute("data-failed")).toBe(true);
    expect(failed.textContent).toBe(
      "Nie udało się wczytać. Odśwież stronę, żeby spróbować ponownie.",
    );
    expect(document.body.textContent).not.toContain("Poproś rodzica o pomoc");
  });

  it("makes the account when GET /me answers AccountMissing", async () => {
    const auth = signedOutAuth();
    auth.signedIn = true;
    const api = client({
      getMe: async () => {
        throw new ApiError("no account", 409, "AccountMissing");
      },
      createAccount: vi.fn(async () => me([snapshot])),
    });
    // The child's lessons are on the child's page (dl-uukj.47.3).
    window.history.replaceState(null, "", `/parent/children/${LEARNER}`);
    render(<ParentScreen language="pl" query={new URLSearchParams()} auth={auth} client={api} />);
    await screen.findByText("Jeszcze nie ma tu lekcji.");
    expect(api.createAccount).toHaveBeenCalledTimes(1);
  });

  it("draws each lesson on the child's page as a row of tiles, links it to its attempt page, and opens it", async () => {
    const auth = signedOutAuth();
    auth.signedIn = true;
    const attempts = {
      learner: snapshot.learner,
      attempts: [
        {
          attempt: { id: ATTEMPT, started_at: AT },
          title: "Równe grupy",
          results: [
            result(1, 1, 1),
            result(1, 2, 2, { ended: "missed", correct: false, first_try_correct: false }),
            result(1, 3, 3, {
              ended: "skipped",
              correct: false,
              first_try_correct: false,
              tries: 0,
              skip_reason: "dont_know",
            }),
            twin(1, 4, 7, 3),
          ],
        },
      ],
    } as unknown as LearnerAttempts;
    const getParentReview = vi.fn(async () => {
      throw new ApiError("not finished", 409, "AttemptNotFinished");
    });
    const api = client({
      getMe: async () => me([snapshot]),
      getLearnerAttempts: async () => attempts,
      getParentReview,
    });
    window.history.replaceState(null, "", `/parent/children/${LEARNER}`);
    render(<ParentScreen language="pl" query={new URLSearchParams()} auth={auth} client={api} />);
    await screen.findByText("Równe grupy");
    const lesson = document.querySelector(`li[data-attempt="${ATTEMPT}"]`);
    // A tile per planned question, the twin folded into its question's tile as the heatmap does,
    // each keeping the stored ended; the text lines are gone.
    const items = [...(lesson?.querySelectorAll<HTMLElement>("li[data-seq]") ?? [])];
    expect(items.map((i) => [i.dataset["seq"], i.dataset["ended"]])).toEqual([
      ["1", "correct"],
      ["2", "missed"],
      ["3", "skipped"],
    ]);
    expect(
      items.map((i) => i.querySelector("[data-outcome]")?.getAttribute("data-outcome")),
    ).toEqual(["first_try", "not_yet", "got_there"]);
    for (const item of items)
      expect(
        item.querySelector(
          `[data-icon="${item.querySelector("[data-outcome]")?.getAttribute("data-outcome")}"]`,
        ),
      ).not.toBeNull();
    expect(screen.getByRole("img", { name: "Pytanie 2: Jeszcze nie" })).toBeTruthy();
    expect(items[2]?.querySelector("[data-twin-mark]")).not.toBeNull();
    expect(lesson?.textContent).not.toContain("Ile to");
    const link = lesson?.querySelector("a[data-attempt-link]");
    expect(link?.getAttribute("href")).toBe(`/parent/attempts/${ATTEMPT}?learner=${LEARNER}`);

    await press("a[data-attempt-link]");
    expect(window.location.pathname).toBe(`/parent/attempts/${ATTEMPT}`);
    await screen.findByText("Nie udało się wczytać. Odśwież stronę, żeby spróbować ponownie.");
    expect(getParentReview).toHaveBeenCalledWith(LEARNER, ATTEMPT);
  });

  it("links each lesson on the child's page to its assignment's overview, and opens it", async () => {
    const auth = signedOutAuth();
    auth.signedIn = true;
    const attempts = {
      learner: snapshot.learner,
      attempts: [
        {
          attempt: { id: ATTEMPT, assignment_id: ASSIGNMENT, started_at: AT },
          title: "Równe grupy",
          results: [],
        },
      ],
    } as unknown as LearnerAttempts;
    const getAssignmentAttempts = vi.fn(async () => {
      throw new ApiError("not found", 404, "NotFound");
    });
    const api = client({
      getMe: async () => me([snapshot]),
      getLearnerAttempts: async () => attempts,
      getAssignmentAttempts,
    });
    window.history.replaceState(null, "", `/parent/children/${LEARNER}`);
    render(<ParentScreen language="pl" query={new URLSearchParams()} auth={auth} client={api} />);
    const link = await screen.findByRole("link", { name: "Wszystkie podejścia do tej lekcji" });
    expect(link.getAttribute("href")).toBe(`/parent/assignments/${ASSIGNMENT}`);

    await press("a[data-overview-link]");
    expect(window.location.pathname).toBe(`/parent/assignments/${ASSIGNMENT}`);
    await screen.findByText("Nie udało się wczytać. Odśwież stronę, żeby spróbować ponownie.");
    expect(getAssignmentAttempts).toHaveBeenCalledWith(ASSIGNMENT);
  });

  // The first screen and Dodaj dziecko (dl-uukj.47.2, decision dl-xo0q).
  it("adds a child from Dla in a dialog: Dla shows the child and the box keeps its words", async () => {
    const auth = signedOutAuth();
    auth.signedIn = true;
    let learners: LearnerSnapshot[] = [];
    const api = client({
      getMe: async () => me(learners),
      createLearner: vi.fn(async () => {
        learners = [snapshot];
        return snapshot;
      }),
    });
    render(<ParentScreen language="pl" query={new URLSearchParams()} auth={auth} client={api} />);
    const field = await screen.findByRole("textbox", { name: "Opisz zadanie domowe" });
    fireEvent.change(field, { target: { value: "Odejmowanie przez 10" } });

    await press("[data-dla]");
    await act(async () => fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem")));
    const dialog = screen.getByRole("dialog", { name: "Dodaj dziecko" });
    expect(within(dialog).getByText(/Nie trafia do lekcji/)).toBeDefined();
    expect(within(dialog).getByRole("radiogroup", { name: "Klasa" })).toBeDefined();
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: " Ola " } });
    await press("[data-add-child-dialog] [data-add]");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(api.createLearner).toHaveBeenCalledWith({ first_name: "Ola" });
    expect(document.querySelector("[data-dla]")?.textContent).toContain("Ola");
    expect(document.querySelector(`[data-child-row="${LEARNER}"]`)).not.toBeNull();
    expect(
      (screen.getByRole("textbox", { name: "Opisz zadanie domowe" }) as HTMLTextAreaElement).value,
    ).toBe("Odejmowanie przez 10");
  });

  it("adds the child once when the read after it fails and Dodaj is pressed again", async () => {
    const auth = signedOutAuth();
    auth.signedIn = true;
    let learners: LearnerSnapshot[] = [];
    let reads = 0;
    const api = client({
      getMe: async () => {
        reads += 1;
        if (reads === 2) throw new Error("offline");
        return me(learners);
      },
      createLearner: vi.fn(async () => {
        learners = [snapshot];
        return snapshot;
      }),
    });
    render(<ParentScreen language="pl" query={new URLSearchParams()} auth={auth} client={api} />);
    await screen.findByRole("textbox", { name: "Opisz zadanie domowe" });
    await press("[data-dla]");
    await act(async () => fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem")));
    const dialog = screen.getByRole("dialog", { name: "Dodaj dziecko" });
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Ola" } });
    await press("[data-add-child-dialog] [data-add]");
    expect(screen.getByRole("dialog", { name: "Dodaj dziecko" })).toBeDefined();
    await press("[data-add-child-dialog] [data-add]");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(api.createLearner).toHaveBeenCalledTimes(1);
    expect(document.querySelector(`[data-child-row="${LEARNER}"]`)).not.toBeNull();
  });

  it("opens Dodaj dziecko from the sidebar's + and gives the focus back to it on Anuluj", async () => {
    const auth = signedOutAuth();
    auth.signedIn = true;
    const api = client({ getMe: async () => me([]) });
    render(<ParentScreen language="pl" query={new URLSearchParams()} auth={auth} client={api} />);
    const plus = await screen.findByRole("button", { name: "Dodaj dziecko" });
    plus.focus();
    await act(async () => fireEvent.click(plus));
    const dialog = screen.getByRole("dialog", { name: "Dodaj dziecko" });
    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Anuluj" })));
    await waitFor(() => expect(document.activeElement).toBe(plus));
  });

  it("starts Dla at the child ?for names", async () => {
    const auth = signedOutAuth();
    auth.signedIn = true;
    const api = client({ getMe: async () => me([snapshot]) });
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams(`for=${LEARNER}`)}
        auth={auth}
        client={api}
      />,
    );
    await screen.findByRole("textbox", { name: "Opisz zadanie domowe" });
    expect(document.querySelector("[data-dla]")?.textContent).toContain("Ola");
  });

  it("shows no provider button when the build turns none on", async () => {
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams()}
        auth={signedOutAuth()}
        client={client({})}
      />,
    );
    await screen.findByText("Wyślij kod");
    expect(document.querySelector("[data-providers]")).toBeNull();
    expect(screen.queryByText("albo")).toBeNull();
  });

  it("starts the provider jadwigo.pl/zaloguj handed over, once, with the hand-over gone from the URL", async () => {
    window.history.replaceState(null, "", "/parent?provider=facebook&lang=pl");
    const auth = signedOutAuth(["google", "facebook"]);
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams("provider=facebook&lang=pl")}
        auth={auth}
        client={client({})}
      />,
    );
    await screen.findByRole("button", { name: "Kontynuuj z Facebookiem" });
    await vi.waitFor(() => expect(auth.signInWith).toHaveBeenCalledTimes(1));
    expect(auth.signInWith).toHaveBeenCalledWith(
      "facebook",
      `${window.location.origin}/parent?lang=pl`,
    );
    expect(window.location.search).toBe("?lang=pl");
  });

  it("does not start a provider the project has off", async () => {
    window.history.replaceState(null, "", "/parent?provider=facebook");
    const auth = signedOutAuth(["google"]);
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams("provider=facebook")}
        auth={auth}
        client={client({})}
      />,
    );
    await screen.findByRole("button", { name: "Kontynuuj z Google" });
    expect(auth.signInWith).not.toHaveBeenCalled();
  });

  it("fills the address jadwigo.pl/zaloguj handed over and sends the code", async () => {
    window.history.replaceState(null, "", "/parent?email=mama%40example.com");
    const auth = signedOutAuth();
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams("email=mama%40example.com")}
        auth={auth}
        client={client({})}
      />,
    );
    await vi.waitFor(() => expect(auth.sendCode).toHaveBeenCalledWith("mama@example.com"));
    expect(auth.sendCode).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("");
  });

  it("lists Google, then Facebook, under the email code, and leaves for the provider from this page", async () => {
    window.history.replaceState(null, "", `/parent?claim=${ASSIGNMENT}&lang=pl`);
    const auth = signedOutAuth(["google", "facebook"]);
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams(`claim=${ASSIGNMENT}&lang=pl`)}
        auth={auth}
        client={client({})}
      />,
    );
    await screen.findByRole("button", { name: "Kontynuuj z Google" });
    const buttons = [...document.querySelectorAll<HTMLElement>("[data-provider]")];
    expect(buttons.map((b) => [b.dataset["provider"], b.textContent])).toEqual([
      ["google", "Kontynuuj z Google"],
      ["facebook", "Kontynuuj z Facebookiem"],
    ]);
    // The email code comes first.
    const send = document.querySelector("[data-send-code]");
    const after = (send?.compareDocumentPosition(buttons[0] as Node) ?? 0) & 4;
    expect(after).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    await press('[data-provider="google"]');
    expect(auth.signInWith).toHaveBeenCalledWith(
      "google",
      `${window.location.origin}/parent?claim=${ASSIGNMENT}&lang=pl`,
    );
  });

  it("signs in from a provider's ?code= return, then goes on to GET /me and the claim's child", async () => {
    storedAttempt.set(ASSIGNMENT, ATTEMPT);
    window.history.replaceState(null, "", `/parent?claim=${ASSIGNMENT}&code=abc123`);
    const auth = signedOutAuth(["google"]);
    const getMe = vi.fn(async () => NOBODY);
    const api = client({ getMe, createAccount: vi.fn(async () => me([])) });
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams(`claim=${ASSIGNMENT}&code=abc123`)}
        auth={auth}
        client={api}
      />,
    );
    await screen.findByText("Imię dziecka");
    expect(auth.completeRedirect).toHaveBeenCalledTimes(1);
    expect(vi.mocked(auth.completeRedirect).mock.calls[0]?.[0].searchParams.get("code")).toBe(
      "abc123",
    );
    expect(getMe).toHaveBeenCalled();
    expect(api.createAccount).toHaveBeenCalledWith({ language: "pl" });
    expect(storedAttempt.get(ASSIGNMENT)).toBe(ATTEMPT);
  });

  it("offers the email code when the provider gave no email", async () => {
    window.history.replaceState(
      null,
      "",
      "/parent?error=server_error&error_description=Error+getting+user+email+from+external+provider",
    );
    const auth = signedOutAuth(["google", "facebook"]);
    render(
      <ParentScreen language="pl" query={new URLSearchParams()} auth={auth} client={client({})} />,
    );
    const line = await screen.findByRole("alert");
    expect(line.hasAttribute("data-provider-problem")).toBe(true);
    expect(line.textContent).toBe(
      "To konto na Facebooku nie ma adresu e-mail, więc nie można się nim tu zalogować. Zaloguj się kodem z e-maila.",
    );
    expect(document.querySelector("[data-email]")).not.toBeNull();
  });

  it("says kindly that a provider's sign-in did not finish, for any other error", async () => {
    window.history.replaceState(null, "", "/parent#error=access_denied&error_description=denied");
    render(
      <ParentScreen
        language="en"
        query={new URLSearchParams()}
        auth={signedOutAuth(["google"])}
        client={client({})}
      />,
    );
    expect((await screen.findByRole("alert")).textContent).toBe(
      "That sign-in didn't finish. Try again, or sign in with a code by email.",
    );
  });

  it("puts a line and this page's link in Google's place inside Facebook's own browser", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.127 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.42.109;]",
    );
    const writeText = vi.fn(async (_text: string) => {});
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ writeText } as unknown as Clipboard);
    window.history.replaceState(null, "", `/parent?claim=${ASSIGNMENT}`);
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams(`claim=${ASSIGNMENT}`)}
        auth={signedOutAuth(["google", "facebook"])}
        client={client({})}
      />,
    );
    await screen.findByRole("button", { name: "Kontynuuj z Facebookiem" });
    expect(document.querySelector('[data-provider="google"]')).toBeNull();
    expect(document.querySelector('[data-provider="facebook"]')).not.toBeNull();
    expect(document.querySelector("[data-email]")).not.toBeNull();
    expect(
      screen.getByText(
        "W tej aplikacji Google nie pozwala się zalogować. Aby kontynuować z Google, otwórz tę stronę w przeglądarce telefonu.",
      ),
    ).toBeTruthy();

    await press("[data-copy-link]");
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/parent?claim=${ASSIGNMENT}`);
    expect(await screen.findByText("Skopiowano. Wklej go w przeglądarce.")).toBeTruthy();
  });

  it("keeps the Google button in Safari", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    );
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams()}
        auth={signedOutAuth(["google", "facebook"])}
        client={client({})}
      />,
    );
    await screen.findByRole("button", { name: "Kontynuuj z Google" });
    expect(document.querySelector('[data-provider="google"]')).not.toBeNull();
    expect(document.querySelector("[data-open-in-browser]")).toBeNull();
  });

  it("puts Google's G before the button's words, which stay its accessible name", async () => {
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams()}
        auth={signedOutAuth(["google", "facebook"])}
        client={client({})}
      />,
    );
    const google = await screen.findByRole("button", { name: "Kontynuuj z Google" });
    const mark = google.querySelector('img[data-provider-mark="google"]');
    expect(mark?.getAttribute("src")).toMatch(/google-g\.svg/);
    // The G is decorative: the words name the button, once.
    expect(mark?.getAttribute("alt")).toBe("");
    expect(google.firstElementChild).toBe(mark);
    expect(google.style.backgroundColor).not.toBe("");
    expect(google.style.fontFamily).toContain("Google Sans");
  });

  it("puts Meta's f before the Facebook button's words, which stay its accessible name", async () => {
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams()}
        auth={signedOutAuth(["google", "facebook"])}
        client={client({})}
      />,
    );
    const facebook = await screen.findByRole("button", { name: "Kontynuuj z Facebookiem" });
    const mark = facebook.querySelector('img[data-provider-mark="facebook"]');
    // Under 4 KB, Vite inlines the file as a data URL.
    expect(mark?.getAttribute("src")).toMatch(/facebook-f\.svg|^data:image\/svg\+xml/);
    expect(mark?.getAttribute("alt")).toBe("");
    expect(facebook.firstElementChild).toBe(mark);
    // Google's font stays on Google's button.
    expect(facebook.style.fontFamily).toBe("");
  });

  it("gives Facebook's button Google's shape and text size, in the page's font", async () => {
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams()}
        auth={signedOutAuth(["google", "facebook"])}
        client={client({})}
      />,
    );
    const facebook = await screen.findByRole("button", { name: "Kontynuuj z Facebookiem" });
    const google = screen.getByRole("button", { name: "Kontynuuj z Google" });
    const shape = (b: HTMLElement) => ({
      className: b.className,
      fill: b.style.backgroundColor,
      stroke: b.style.borderColor,
      ink: b.style.color,
      weight: b.style.fontWeight,
      size: b.style.fontSize,
      line: b.style.lineHeight,
    });
    expect(shape(facebook)).toEqual(shape(google));
    expect(google.style.fontFamily).toContain("Google Sans");
    expect(facebook.style.fontFamily).toBe("");
  });

  it("shows the failed line in StrictMode too, where the effect runs twice on the first mount", async () => {
    window.history.replaceState(null, "", "/parent?code=spent");
    const exchangeCodeForSession = vi.fn(async (_code: string) => ({
      data: {},
      error: new Error("invalid flow state"),
    }));
    const supabase = {
      auth: {
        exchangeCodeForSession,
        getSession: async () => ({ data: { session: null }, error: null }),
      },
    } as unknown as SupabaseClient;
    render(
      <StrictMode>
        <ParentScreen
          language="en"
          query={new URLSearchParams()}
          auth={supabaseAuth(supabase, ["google"])}
          client={client({})}
        />
      </StrictMode>,
    );
    expect((await screen.findByRole("alert")).textContent).toBe(
      "That sign-in didn't finish. Try again, or sign in with a code by email.",
    );
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("");
  });

  it("shows a provider's button only when the project has that provider on", async () => {
    const auth = signedOutAuth(["google", "facebook"], ["google"]);
    render(
      <ParentScreen language="pl" query={new URLSearchParams()} auth={auth} client={client({})} />,
    );
    await screen.findByRole("button", { name: "Kontynuuj z Google" });
    expect(document.querySelector('[data-provider="facebook"]')).toBeNull();
    expect(auth.enabledProviders).toHaveBeenCalledTimes(1);
  });

  it("shows no provider button when the project has them off, and keeps the email code", async () => {
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams()}
        auth={signedOutAuth(["google", "facebook"], [])}
        client={client({})}
      />,
    );
    await screen.findByText("Wyślij kod");
    await act(async () => {});
    expect(document.querySelector("[data-providers]")).toBeNull();
    expect(document.querySelector("[data-email]")).not.toBeNull();
  });

  it("shows no provider button when the project's settings cannot be read", async () => {
    render(
      <ParentScreen
        language="pl"
        query={new URLSearchParams()}
        auth={signedOutAuth(["google", "facebook"], "unreadable")}
        client={client({})}
      />,
    );
    await screen.findByText("Wyślij kod");
    await act(async () => {});
    expect(document.querySelector("[data-providers]")).toBeNull();
    expect(document.querySelector("[data-send-code]")).not.toBeNull();
  });
});
