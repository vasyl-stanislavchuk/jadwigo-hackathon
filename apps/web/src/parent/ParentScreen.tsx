/**
 * The parent's screens at /parent (dl-e8ov.2.38, docs/research/parent-login.md):
 *
 *   signed out   email, then the 6-digit code, in this tab
 *   signed in    GET /me; with no account yet, POST /accounts once (it is idempotent)
 *     ?claim     the tab still holds an attempt of that assignment: pick the child, or add one,
 *                and POST /attempts/{id}/claims; the tab then forgets the attempt
 *     no child   add one: a first name (goals and the age group wait on the owner)
 *     home       each child, with their lessons, newest first
 *
 * The page is for the adult, so it has no lesson frame around it.
 */

import { ApiError, type Client, createClient, type ParentClient } from "@jadwigo/api-client";
import type {
  AssignmentId,
  AttemptId,
  Learner,
  LearnerAttempts,
  LearnerId,
  Me,
} from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, Input, Spinner } from "@jadwigo/ui";
import {
  type FormEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { storedAttempt } from "../play/storedAttempt.ts";
import { navigate } from "../playground/route.ts";
import { type Auth, browserAuth } from "./auth.ts";
import { claimOf, parentPath } from "./route.ts";

const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

function Page({ children }: { children: ReactNode }): ReactElement {
  return (
    <main data-parent className="mx-auto flex max-w-2xl flex-col items-start gap-6 p-6 text-lg">
      {children}
    </main>
  );
}

function Loading({ language }: { language: Language }): ReactElement {
  return (
    <Page>
      <Spinner label={copy(language, "loading")} />
    </Page>
  );
}

export function ParentScreen({
  language,
  query,
  auth = browserAuth(),
  client,
}: {
  language: Language;
  query: URLSearchParams;
  /** The sign-in, for tests; the build's Supabase project when absent, or none. */
  auth?: Auth | null;
  /** The API, for tests; the page's own origin, with the sign-in's token, when absent. */
  client?: ParentClient;
}): ReactElement {
  const api = useMemo<ParentClient>(
    () =>
      client ??
      (createClient({
        base: "",
        token: () => auth?.token() ?? Promise.resolve(null),
      }) satisfies Client),
    [client, auth],
  );
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    if (auth === null) return;
    let live = true;
    auth.token().then(
      (token) => live && setSignedIn(token !== null),
      () => live && setSignedIn(false),
    );
    return () => {
      live = false;
    };
  }, [auth]);

  if (auth === null)
    return (
      <Page>
        <p data-parent-off>{copy(language, "parent_off")}</p>
      </Page>
    );
  if (signedIn === null) return <Loading language={language} />;
  if (!signedIn)
    return <SignIn auth={auth} language={language} onSignedIn={() => setSignedIn(true)} />;
  return (
    <SignedIn
      api={api}
      language={language}
      claim={claimOf(query)}
      onSignOut={() => {
        auth.signOut().finally(() => setSignedIn(false));
      }}
    />
  );
}

function SignIn({
  auth,
  language,
  onSignedIn,
}: {
  auth: Auth;
  language: Language;
  onSignedIn: () => void;
}): ReactElement {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CopyKey | null>(null);
  const emailId = useId();
  const codeId = useId();

  const send = (event: FormEvent): void => {
    event.preventDefault();
    const to = email.trim();
    if (to === "" || busy) return;
    setBusy(true);
    setProblem(null);
    auth
      .sendCode(to)
      .then(
        () => setSentTo(to),
        () => setProblem("parent_send_failed"),
      )
      .finally(() => setBusy(false));
  };

  const verify = (event: FormEvent): void => {
    event.preventDefault();
    if (sentTo === null || busy) return;
    setBusy(true);
    setProblem(null);
    auth
      .verifyCode(sentTo, code.trim())
      .then(
        (ok) => (ok ? onSignedIn() : setProblem("parent_code_mismatch")),
        () => setProblem("parent_code_mismatch"),
      )
      .finally(() => setBusy(false));
  };

  return (
    <Page>
      <h1 className="text-3xl font-semibold">{copy(language, "parent_title")}</h1>
      <p>{copy(language, "parent_promise")}</p>
      <p>{copy(language, "parent_guardian")}</p>
      {sentTo === null ? (
        <form onSubmit={send} className="flex w-full flex-col gap-3" data-email-step>
          <label htmlFor={emailId}>{copy(language, "parent_email")}</label>
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-email
          />
          <Button type="submit" disabled={busy} data-send-code>
            {copy(language, "parent_send_code")}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex w-full flex-col gap-3" data-code-step>
          <p>{copy(language, "parent_code_sent", { email: sentTo })}</p>
          <label htmlFor={codeId}>{copy(language, "parent_code")}</label>
          <Input
            id={codeId}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            data-code
          />
          <Button type="submit" disabled={busy} data-sign-in>
            {copy(language, "parent_sign_in")}
          </Button>
        </form>
      )}
      {problem !== null && (
        <p role="alert" data-problem>
          {copy(language, problem)}
        </p>
      )}
    </Page>
  );
}

/** A claim refusal the page takes calmly: the line it shows, or null for none. Anything else fails. */
const CLAIM_REFUSED: Record<string, CopyKey | null> = {
  AttemptClaimed: "parent_claimed_elsewhere",
  AttemptPreview: "parent_claim_preview",
  // The attempt is gone (swept, or the database rebuilt): nothing to keep.
  NotFound: null,
};

type View = { kind: "loading" } | { kind: "failed" } | { kind: "ready"; me: Me };

/** The tab's attempt of `?claim`'s assignment, if it still holds one. */
function pendingClaim(
  claim: AssignmentId | null,
): { assignment: AssignmentId; attempt: AttemptId } | null {
  if (claim === null) return null;
  const attempt = storedAttempt.get(claim);
  return attempt === null ? null : { assignment: claim, attempt };
}

/** GET /me, and POST /accounts once when the signed-in adult has no account yet. */
async function meOf(api: ParentClient, language: Language): Promise<Me> {
  let me: Me | null = null;
  try {
    me = await api.getMe();
  } catch (error) {
    if (!(isApiError(error) && error.type === "AccountMissing")) throw error;
  }
  return me?.account ? me : api.createAccount({ language });
}

function SignedIn({
  api,
  language,
  claim,
  onSignOut,
}: {
  api: ParentClient;
  language: Language;
  claim: AssignmentId | null;
  onSignOut: () => void;
}): ReactElement {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [pending, setPending] = useState(() => pendingClaim(claim));
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<CopyKey | null>(null);

  const load = useCallback(() => {
    meOf(api, language).then(
      (me) => setView({ kind: "ready", me }),
      () => setView({ kind: "failed" }),
    );
  }, [api, language]);
  useEffect(load, [load]);

  /** Keeps the tab's attempt for `learner`, then forgets it here: after a 201, or a refusal that
   * means it can never be kept. Any other failure keeps it, for another go. */
  const keepFor = async (learner: LearnerId): Promise<void> => {
    if (pending === null) return;
    try {
      // 201 for a first claim and for a replay by the same account for the same learner.
      await api.claimAttempt(pending.attempt, { learner_id: learner });
    } catch (error) {
      const refused = isApiError(error) ? CLAIM_REFUSED[error.type ?? ""] : undefined;
      if (refused === undefined) throw error;
      if (refused !== null) setNotice(refused);
    }
    storedAttempt.clear(pending.assignment);
    setPending(null);
    navigate(parentPath({ lang: new URLSearchParams(window.location.search).get("lang") }), {
      replace: true,
    });
  };

  const run = (work: () => Promise<void>): void => {
    setView({ kind: "loading" });
    work().then(load, () => setView({ kind: "failed" }));
  };

  const addChild = (firstName: string): void =>
    run(async () => {
      const { learner } = await api.createLearner({ first_name: firstName });
      setAdding(false);
      await keepFor(learner.id);
    });

  if (view.kind === "loading") return <Loading language={language} />;
  if (view.kind === "failed")
    return (
      <Page>
        <p data-failed>{copy(language, "load_failed")}</p>
      </Page>
    );

  const learners = view.me.learners.map((s) => s.learner);
  const signOut = (
    <Button type="button" variant="outline" onClick={onSignOut} data-sign-out>
      {copy(language, "parent_sign_out")}
    </Button>
  );

  if (learners.length === 0 || adding)
    return (
      <Page>
        <AddChild language={language} onAdd={addChild} />
        {signOut}
      </Page>
    );

  if (pending !== null)
    return (
      <Page>
        <h1 className="text-3xl font-semibold">{copy(language, "parent_whose")}</h1>
        <ul className="flex w-full flex-col gap-3" data-whose>
          {learners.map((learner) => (
            <li key={learner.id}>
              <Button
                type="button"
                className="w-full"
                data-learner={learner.id}
                onClick={() => run(() => keepFor(learner.id))}
              >
                {learner.first_name}
              </Button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" onClick={() => setAdding(true)} data-add-another>
          {copy(language, "parent_add_child")}
        </Button>
      </Page>
    );

  return (
    <Page>
      <h1 className="text-3xl font-semibold">{copy(language, "parent_title")}</h1>
      {notice !== null && <p role="status">{copy(language, notice)}</p>}
      <ul className="flex w-full flex-col gap-6" data-home>
        {learners.map((learner) => (
          <LearnerCard key={learner.id} api={api} learner={learner} language={language} />
        ))}
      </ul>
      <Button type="button" variant="outline" onClick={() => setAdding(true)} data-add-another>
        {copy(language, "parent_add_child")}
      </Button>
      {signOut}
    </Page>
  );
}

function AddChild({
  language,
  onAdd,
}: {
  language: Language;
  onAdd: (firstName: string) => void;
}): ReactElement {
  const [name, setName] = useState("");
  const nameId = useId();
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const firstName = name.trim();
    if (firstName !== "") onAdd(firstName);
  };
  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-3" data-add-child>
      <h1 className="text-3xl font-semibold">{copy(language, "parent_add_child")}</h1>
      <label htmlFor={nameId}>{copy(language, "parent_first_name")}</label>
      <Input
        id={nameId}
        required
        maxLength={60}
        autoComplete="off"
        value={name}
        onChange={(e) => setName(e.target.value)}
        data-first-name
      />
      <Button type="submit" data-add>
        {copy(language, "parent_add")}
      </Button>
    </form>
  );
}

const ENDED: Record<"correct" | "missed" | "skipped" | "open", CopyKey> = {
  correct: "play_ended_correct",
  missed: "play_ended_missed",
  skipped: "play_ended_skipped",
  open: "play_ended_open",
};

function LearnerCard({
  api,
  learner,
  language,
}: {
  api: ParentClient;
  learner: Learner;
  language: Language;
}): ReactElement {
  const [attempts, setAttempts] = useState<LearnerAttempts["attempts"] | "failed" | null>(null);
  useEffect(() => {
    let live = true;
    api.getLearnerAttempts(learner.id).then(
      (reply) => live && setAttempts(reply.attempts),
      () => live && setAttempts("failed"),
    );
    return () => {
      live = false;
    };
  }, [api, learner.id]);
  const day = new Intl.DateTimeFormat(language, { dateStyle: "long" });
  return (
    <li className="flex flex-col gap-3" data-learner-card={learner.id}>
      <h2 className="text-2xl font-semibold">{learner.first_name}</h2>
      {attempts === null && <Spinner label={copy(language, "loading")} />}
      {attempts === "failed" && <p data-failed>{copy(language, "load_failed")}</p>}
      {Array.isArray(attempts) && attempts.length === 0 && (
        <p>{copy(language, "parent_no_attempts")}</p>
      )}
      {Array.isArray(attempts) && attempts.length > 0 && (
        <ol className="flex flex-col gap-4">
          {attempts.map(({ attempt, title, results }) => (
            <li
              key={attempt.id}
              data-attempt={attempt.id}
              className="flex flex-col gap-2 rounded-xl border p-4"
            >
              <span className="font-semibold">{title}</span>
              <span className="text-sm">{day.format(new Date(attempt.started_at))}</span>
              <ol className="flex flex-col gap-1">
                {results.map((row) => (
                  <li key={row.seq} data-seq={row.seq} data-ended={row.ended ?? "open"}>
                    {row.say}: {copy(language, ENDED[row.ended ?? "open"])}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}
