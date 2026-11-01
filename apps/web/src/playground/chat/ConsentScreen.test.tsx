import { ApiError, type ParentClient, type PodClient } from "@jadwigo/api-client";
import { ErrorType, type Me, type Pod, PodId } from "@jadwigo/contracts";
import { ConversationId, type Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setPodLanguage } from "../../nav/language.ts";
import type { Auth } from "../../parent/auth.ts";
import { ParentScreen } from "../../parent/ParentScreen.tsx";
import { ChatScreen } from "./ChatScreen.tsx";
import type { ConsentClient } from "./ConsentScreen.tsx";
import type { EngineTransport } from "./useConversation.ts";
import type { SendBody } from "./wire.ts";

beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/parent");
});
afterEach(() => {
  cleanup();
  act(() => setPodLanguage(null));
});

const AT = "2026-11-01T10:00:00.000Z";
const POD = PodId.parse("pod_6et2fhbnwvb45aw9atcfzs33za");

/** A made-up family, signed in, with one child and a pod whose consent is `consent`. */
function meWith(consent: string | null): Me {
  return {
    account: { id: "acc_7qre3atahx8cpak6xbjtz73var", pod_id: POD, sub: "s", created_at: AT },
    member: null,
    pod: { id: POD, name: "Dom", language: "pl", created_at: AT, ai_consent_at: consent },
    learners: [
      {
        learner: {
          id: "lrn_2h4m8gyw0fb1cvz2nkqw0px8fq",
          pod_id: POD,
          handle: "ola",
          first_name: "Ola",
          age_group: null,
          created_at: AT,
        },
        goals: [],
      },
    ],
  } as unknown as Me;
}

const signedIn = {
  token: async () => "header.payload.signature",
  completeRedirect: async () => "none",
  signOut: async () => {},
} as unknown as Auth;

const refused = (): never => {
  throw new Error("not called in this test");
};

/** The parent's API over one pod, whose consent the PATCH gives. */
function family(consent: string | null) {
  const state = { consent, patched: [] as unknown[] };
  const api: ParentClient = {
    getMe: async () => meWith(state.consent),
    createAccount: refused,
    createLearner: refused,
    claimAttempt: refused,
    getLearnerAttempts: async () => ({
      learner: meWith(null).learners[0]?.learner as never,
      attempts: [],
    }),
    getParentReview: refused,
    getAssignmentAttempts: refused,
  };
  const pods: PodClient = {
    patchPod: async (id, body) => {
      state.patched.push([id, body]);
      state.consent = AT;
      return meWith(AT).pod as Pod;
    },
  };
  return { api, pods, state };
}

const screenFor = (f: ReturnType<typeof family>) =>
  render(
    <ParentScreen
      language="pl"
      query={new URLSearchParams()}
      auth={signedIn}
      client={f.api}
      pods={f.pods}
    />,
  );

/** The screen's Agree, once the screen is drawn. */
async function agreeButton(): Promise<HTMLElement> {
  await screen.findByText("Zanim porozmawiasz z asystentem");
  return screen.getByRole("button", { name: "Zgadzam się" });
}

describe("the consent screen in /parent, once after sign-up (dl-z5ja.32)", () => {
  it("shows while the pod has no ai_consent_at, and its words name what is sent", async () => {
    screenFor(family(null));
    expect(await screen.findByText("Zanim porozmawiasz z asystentem")).toBeTruthy();
    const text = document.querySelector("[data-consent]")?.textContent ?? "";
    expect(text).toContain("dane dziecka, imiona też");
    expect(text).toContain("modeli firmy Meta, które mogą się na nich uczyć");
    expect(text).toContain("dopóki konto nie zostanie usunięte");
    expect(text).toContain("Zarchiwizowana rozmowa też");
  });

  it("Agree patches the pod with ai_consented, then the home shows", async () => {
    const f = family(null);
    screenFor(f);
    const agree = await agreeButton();
    await act(async () => fireEvent.click(agree));
    expect(f.state.patched).toEqual([[POD, { ai_consented: true }]]);
    expect(await screen.findByText("Ola")).toBeTruthy();
    expect(document.querySelector("[data-consent]")).toBeNull();
  });

  it("a failed PATCH keeps the screen and says so", async () => {
    const f = family(null);
    f.pods.patchPod = async () => {
      throw new Error("offline");
    };
    screenFor(f);
    const agree = await agreeButton();
    await act(async () => fireEvent.click(agree));
    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się zapisać zgody. Spróbuj jeszcze raz.",
    );
  });

  it("Nie teraz steps past it for this visit, with no PATCH", async () => {
    const f = family(null);
    screenFor(f);
    await screen.findByText("Zanim porozmawiasz z asystentem");
    fireEvent.click(screen.getByRole("button", { name: "Nie teraz" }));
    expect(await screen.findByText("Ola")).toBeTruthy();
    expect(f.state.patched).toEqual([]);
  });

  it("is not shown once the pod has consented", async () => {
    screenFor(family(AT));
    expect(await screen.findByText("Ola")).toBeTruthy();
    expect(document.querySelector("[data-consent]")).toBeNull();
  });
});

const eventsOf = (name: string): RunEvent[] =>
  (RUN_LOGS.find((l) => l.name === name)?.events ?? []).map((e) => RunEvent.parse(e));

/** A transport whose first send is refused for want of consent, and which answers after it. */
function refusing() {
  const events = eventsOf("happy-turn");
  const run = { id: RunId.parse(events[0]?.run_id), status: "completed" } as unknown as Run;
  const sent: SendBody[] = [];
  let consent = false;
  const transport: EngineTransport = {
    subscribe: () => () => {},
    onConnection: () => () => {},
    runs: async () => [],
    events: async () => [],
    send: async (body) => {
      sent.push(body);
      if (!consent)
        throw new ApiError("the pod has not consented", 409, ErrorType.enum.AiConsentMissing);
      return run;
    },
  };
  const client: ConsentClient = {
    getMe: async () => meWith(null),
    patchPod: async (id, body) => {
      consent = body.ai_consented;
      expect(id).toBe(POD);
      return meWith(AT).pod as Pod;
    },
  };
  return { transport, client, sent };
}

describe("the chat asks for consent only when a route refuses (dl-z5ja.32)", () => {
  it("draws no consent line before a send", async () => {
    const t = refusing();
    render(<ChatScreen transport={t.transport} consent={t.client} />);
    await act(async () => {});
    expect(document.querySelector("[data-consent]")).toBeNull();
    expect(document.body.textContent).not.toContain("Meta");
  });

  it("a 409 AiConsentMissing opens the screen; Agree gives it and sends the message again", async () => {
    window.sessionStorage.setItem(
      "jadwigo.playground.chat.conversation",
      ConversationId.parse("cnv_00000000000000000000000001"),
    );
    const t = refusing();
    render(<ChatScreen transport={t.transport} consent={t.client} />);
    await act(async () => {});
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Lekcja o grupach." } });
    await act(async () =>
      fireEvent.submit(screen.getByRole("textbox").closest("form") as HTMLFormElement),
    );
    expect(await screen.findByText("Zanim porozmawiasz z asystentem")).toBeTruthy();
    // Not a failed send: no message can be sent before consent.
    expect(document.querySelector("[data-row='send-failed']")).toBeNull();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Zgadzam się" })));
    expect(document.querySelector("[data-consent]")).toBeNull();
    expect(t.sent.map((b) => (b.kind === "message" ? b.text : b.kind))).toEqual([
      "Lekcja o grupach.",
      "Lekcja o grupach.",
    ]);
  });
});
