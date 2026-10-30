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
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storedAttempt } from "../play/storedAttempt.ts";
import { type Auth, type Provider, type RedirectOutcome, returnOf } from "./auth.ts";
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

function signedOutAuth(providers: readonly Provider[] = []): Auth & { signedIn: boolean } {
  const auth = {
    signedIn: false,
    token: async () => (auth.signedIn ? "header.payload.signature" : null),
    sendCode: vi.fn(async () => {}),
    verifyCode: vi.fn(async (_email: string, code: string) => {
      auth.signedIn = code === "123456";
      return auth.signedIn;
    }),
    providers: () => providers,
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
  window.history.replaceState(null, "", "/parent");
});
afterEach(cleanup);

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
    await screen.findByText("Ola");
    expect(api.createLearner).toHaveBeenCalledWith({ first_name: "Ola" });
    expect(api.claimAttempt).toHaveBeenCalledWith(ATTEMPT, { learner_id: LEARNER });
    expect(storedAttempt.get(ASSIGNMENT)).toBeNull();
    expect(window.location.search).not.toContain("claim");
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
    render(<ParentScreen language="pl" query={new URLSearchParams()} auth={auth} client={api} />);
    await screen.findByText("Jeszcze nie ma tu lekcji.");
    expect(api.createAccount).toHaveBeenCalledTimes(1);
  });

  it("draws each lesson on the home as a row of tiles, links it to its attempt page, and opens it", async () => {
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

  it("links each lesson on the home to its assignment's overview, and opens it", async () => {
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
    render(<ParentScreen language="pl" query={new URLSearchParams()} auth={auth} client={api} />);
    const link = await screen.findByRole("link", { name: "Wszystkie podejścia do tej lekcji" });
    expect(link.getAttribute("href")).toBe(`/parent/assignments/${ASSIGNMENT}`);

    await press("a[data-overview-link]");
    expect(window.location.pathname).toBe(`/parent/assignments/${ASSIGNMENT}`);
    await screen.findByText("Nie udało się wczytać. Odśwież stronę, żeby spróbować ponownie.");
    expect(getAssignmentAttempts).toHaveBeenCalledWith(ASSIGNMENT);
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
    await screen.findByText("Wyślij kod");
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
});
