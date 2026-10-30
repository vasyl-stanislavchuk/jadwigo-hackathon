/**
 * The parent's screens at /parent (dl-e8ov.2.38, docs/research/parent-login.md):
 *
 *   signed out   email, then the 6-digit code, in this tab
 *   signed in    GET /me; with no account yet, POST /accounts once (it is idempotent)
 *     ?claim     the tab still holds an attempt of that assignment: pick the child, or add one,
 *                and POST /attempts/{id}/claims; the tab then forgets the attempt
 *     no child   add one: a first name (goals and the age group wait on the owner)
 *     home       each child, with their lessons, newest first, each a link to its attempt page
 *   /parent/attempts/<attempt>, signed in: that lesson, question by question (AttemptReview.tsx)
 *   /parent/assignments/<assignment>, signed in: every attempt at that lesson against its
 *                questions (overview/AssignmentOverview.tsx)
 *
 * The page is for the adult, so it has no lesson frame around it: an app page on the kit (Page,
 * Heading, Field, Card, Notice), in the adult's lines (dl-uukj.32 wave 2).
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
import {
  Button,
  Card,
  CardContent,
  Field,
  Heading,
  Input,
  Link,
  Notice,
  Page,
  Spinner,
} from "@jadwigo/ui";
import {
  type FormEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { navigate, useLocation } from "../nav/location.ts";
import { NavLink } from "../nav/NavLink.tsx";
import { storedAttempt } from "../play/storedAttempt.ts";
import { ENDED_WORD } from "../review/outcome.ts";
import { AttemptReview } from "./AttemptReview.tsx";
import { CATEGORY, pageLang } from "./adult.ts";
import { type Auth, browserAuth } from "./auth.ts";
import { AssignmentOverview } from "./overview/AssignmentOverview.tsx";
import {
  assignmentPath,
  attemptPath,
  claimOf,
  learnerOf,
  parentPath,
  parentRoute,
} from "./route.ts";

/** The parent's page: the app page's prose column. */
function ParentPage({ children }: { children: ReactNode }): ReactElement {
  return (
    <Page width="prose" data-parent>
      {children}
    </Page>
  );
}

function Loading({ language }: { language: Language }): ReactElement {
  return (
    <ParentPage>
      <Spinner label={copy(language, "loading", {}, CATEGORY)} />
    </ParentPage>
  );
}

/** The line that says a page could not load: what stops the adult, with what to do. */
function Failed({ language }: { language: Language }): ReactElement {
  return (
    <Notice role="alert" data-failed>
      {copy(language, "parent_load_failed", {}, CATEGORY)}
    </Notice>
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
  const route = parentRoute(useLocation().path);
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
      <ParentPage>
        <Notice data-parent-off>{copy(language, "parent_off", {}, CATEGORY)}</Notice>
      </ParentPage>
    );
  if (signedIn === null) return <Loading language={language} />;
  if (!signedIn)
    return <SignIn auth={auth} language={language} onSignedIn={() => setSignedIn(true)} />;
  if (route?.kind === "attempt")
    return (
      <AttemptReview
        api={api}
        attempt={route.attempt}
        learner={learnerOf(query)}
        language={language}
      />
    );
  if (route?.kind === "assignment")
    return <AssignmentOverview api={api} assignment={route.assignment} language={language} />;
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
  // The one problem there is, said under the step's own field.
  const problemLine =
    problem === null ? undefined : (
      <span data-problem>{copy(language, problem, {}, CATEGORY)}</span>
    );

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
    <ParentPage>
      <Heading>{copy(language, "parent_title", {}, CATEGORY)}</Heading>
      <p>{copy(language, "parent_promise", {}, CATEGORY)}</p>
      <p>{copy(language, "parent_guardian", {}, CATEGORY)}</p>
      {sentTo === null ? (
        <form onSubmit={send} className="flex w-full flex-col gap-4" data-email-step>
          <Field label={copy(language, "parent_email", {}, CATEGORY)} problem={problemLine}>
            <Input
              kind="text"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-email
            />
          </Field>
          <Button type="submit" size="control" disabled={busy} data-send-code>
            {copy(language, "parent_send_code", {}, CATEGORY)}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex w-full flex-col gap-4" data-code-step>
          <Notice>{copy(language, "parent_code_sent", { email: sentTo }, CATEGORY)}</Notice>
          <Field label={copy(language, "parent_code", {}, CATEGORY)} problem={problemLine}>
            <Input
              kind="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              data-code
            />
          </Field>
          <Button type="submit" size="control" disabled={busy} data-sign-in>
            {copy(language, "parent_sign_in", {}, CATEGORY)}
          </Button>
        </form>
      )}
    </ParentPage>
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
    if (!(error instanceof ApiError && error.type === "AccountMissing")) throw error;
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
      const refused = error instanceof ApiError ? CLAIM_REFUSED[error.type ?? ""] : undefined;
      if (refused === undefined) throw error;
      if (refused !== null) setNotice(refused);
    }
    storedAttempt.clear(pending.assignment);
    setPending(null);
    navigate(parentPath({ lang: pageLang() }), { replace: true });
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
      <ParentPage>
        <Failed language={language} />
      </ParentPage>
    );

  const learners = view.me.learners.map((s) => s.learner);
  const signOut = (
    <Button
      type="button"
      variant="outline"
      size="control"
      className="self-start"
      onClick={onSignOut}
      data-sign-out
    >
      {copy(language, "parent_sign_out", {}, CATEGORY)}
    </Button>
  );

  const addAnother = (
    <Button
      type="button"
      variant="outline"
      size="control"
      className="self-start"
      onClick={() => setAdding(true)}
      data-add-another
    >
      {copy(language, "parent_add_child", {}, CATEGORY)}
    </Button>
  );

  if (learners.length === 0 || adding)
    return (
      <ParentPage>
        <AddChild language={language} onAdd={addChild} />
        {signOut}
      </ParentPage>
    );

  if (pending !== null)
    return (
      <ParentPage>
        <Heading>{copy(language, "parent_whose", {}, CATEGORY)}</Heading>
        <ul className="flex w-full flex-col gap-3" data-whose>
          {learners.map((learner) => (
            <li key={learner.id}>
              <Button
                type="button"
                size="control"
                className="w-full"
                data-learner={learner.id}
                onClick={() => run(() => keepFor(learner.id))}
              >
                {learner.first_name}
              </Button>
            </li>
          ))}
        </ul>
        {addAnother}
      </ParentPage>
    );

  return (
    <ParentPage>
      <Heading>{copy(language, "parent_title", {}, CATEGORY)}</Heading>
      {notice !== null && <Notice>{copy(language, notice, {}, CATEGORY)}</Notice>}
      <ul className="flex w-full flex-col gap-8" data-home>
        {learners.map((learner) => (
          <LearnerCard key={learner.id} api={api} learner={learner} language={language} />
        ))}
      </ul>
      {addAnother}
      {signOut}
    </ParentPage>
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
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const firstName = name.trim();
    if (firstName !== "") onAdd(firstName);
  };
  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4" data-add-child>
      <Heading>{copy(language, "parent_add_child", {}, CATEGORY)}</Heading>
      <Field label={copy(language, "parent_first_name", {}, CATEGORY)}>
        <Input
          kind="text"
          required
          maxLength={60}
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-first-name
        />
      </Field>
      <Button type="submit" size="control" data-add>
        {copy(language, "parent_add", {}, CATEGORY)}
      </Button>
    </form>
  );
}

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
    <li className="flex flex-col gap-4" data-learner-card={learner.id}>
      <Heading level={2}>{learner.first_name}</Heading>
      {attempts === null && <Spinner label={copy(language, "loading", {}, CATEGORY)} />}
      {attempts === "failed" && <Failed language={language} />}
      {Array.isArray(attempts) && attempts.length === 0 && (
        <p>{copy(language, "parent_no_attempts", {}, CATEGORY)}</p>
      )}
      {Array.isArray(attempts) && attempts.length > 0 && (
        <ol className="flex flex-col gap-4">
          {attempts.map(({ attempt, title, results }) => (
            <li key={attempt.id} data-attempt={attempt.id}>
              <Card size="compact">
                <CardContent className="items-start gap-2">
                  <Link asChild>
                    <NavLink
                      href={attemptPath({
                        attempt: attempt.id,
                        learner: learner.id,
                        lang: pageLang(),
                      })}
                      data-attempt-link
                    >
                      {title}
                    </NavLink>
                  </Link>
                  <span className="text-jw-small text-jw-ink-soft">
                    {day.format(new Date(attempt.started_at))}
                  </span>
                  <Link asChild size="small">
                    <NavLink
                      href={assignmentPath({ assignment: attempt.assignment_id, lang: pageLang() })}
                      data-overview-link
                    >
                      {copy(language, "parent_overview_link", {}, CATEGORY)}
                    </NavLink>
                  </Link>
                  <ol className="flex flex-col gap-1">
                    {results.map((row) => (
                      <li key={row.seq} data-seq={row.seq} data-ended={row.ended ?? "open"}>
                        {copy(
                          language,
                          "parent_attempt_line",
                          {
                            say: row.say,
                            ended: copy(language, ENDED_WORD[row.ended ?? "open"], {}, CATEGORY),
                          },
                          CATEGORY,
                        )}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}
