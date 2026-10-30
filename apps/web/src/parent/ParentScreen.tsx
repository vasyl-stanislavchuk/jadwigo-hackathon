/**
 * The parent's screens at /parent (dl-e8ov.2.38, docs/research/parent-login.md):
 *
 *   signed out   email, then the 6-digit code, in this tab; or Google or Facebook, which leave the
 *                tab and come back to it with ?code= (dl-e8ov.2.51), or with an error the page
 *                answers with a line that offers the email code
 *   signed in    GET /me; with no account yet, POST /accounts once (it is idempotent)
 *     ?claim     the tab still holds an attempt of that assignment: pick the child, or add one,
 *                and POST /attempts/{id}/claims; the tab then forgets the attempt
 *     no child   add one: a first name (goals and the age group wait on the owner)
 *     home       each child, with their lessons, newest first: each a card with a link to its
 *                attempt page, the day, a tile per question as the overview's heatmap draws that
 *                attempt's row, and a link to the overview (decision 2026-10-30-app-pages-take-an-
 *                adult-type-scale-h1-28-h2-22-body-17-and-the-a)
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
  AttemptResult,
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
  OutcomeTile,
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
import { AttemptReview } from "./AttemptReview.tsx";
import { CATEGORY, pageLang } from "./adult.ts";
import {
  type Auth,
  browserAuth,
  type Provider,
  type RedirectOutcome,
  withoutReturn,
} from "./auth.ts";
import { AssignmentOverview } from "./overview/AssignmentOverview.tsx";
import { cellsOf } from "./overview/grid.ts";
import { OUTCOME_TONE, OutcomeIcon, TwinMark, tileLabel } from "./overview/outcome.tsx";
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
  const [returned, setReturned] = useState<CopyKey | null>(null);
  useEffect(() => {
    if (auth === null) return;
    let live = true;
    // A return from Google or Facebook first: its code becomes the session the token reads.
    auth
      .completeRedirect(new URL(window.location.href))
      .catch((): RedirectOutcome => "failed")
      .then((outcome) => {
        if (live) setReturned(RETURN_LINE[outcome]);
        return auth.token();
      })
      .then(
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
    return (
      <SignIn
        auth={auth}
        language={language}
        returned={returned}
        onSignedIn={() => {
          setReturned(null);
          setSignedIn(true);
        }}
      />
    );
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

/** The line a provider's return leaves on the sign-in page, or null for none. */
const RETURN_LINE: Record<RedirectOutcome, CopyKey | null> = {
  "signed-in": null,
  none: null,
  // Supabase refuses an account with no email (a Facebook account made with a phone): the email
  // code is the way in (docs/research/social-sign-in.md, "No email").
  "no-email": "parent_provider_no_email",
  failed: "parent_provider_failed",
};

/** Each provider's button. */
const PROVIDER_LABEL: Record<Provider, CopyKey> = {
  google: "parent_continue_google",
  facebook: "parent_continue_facebook",
};

function SignIn({
  auth,
  language,
  returned,
  onSignedIn,
}: {
  auth: Auth;
  language: Language;
  /** The line a provider's return left, or null. */
  returned: CopyKey | null;
  onSignedIn: () => void;
}): ReactElement {
  const [providerProblem, setProviderProblem] = useState<CopyKey | null>(returned);
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

  /** Leaves for the provider, to come back to this page as it is: /parent, its claim and lang. */
  const continueWith = (provider: Provider): void => {
    if (busy) return;
    setBusy(true);
    setProviderProblem(null);
    const here = new URL(window.location.href);
    const returnTo = new URL(withoutReturn(here), here.origin).href;
    auth.signInWith(provider, returnTo).catch(() => {
      setProviderProblem("parent_provider_failed");
      setBusy(false);
    });
  };

  const providers = auth.providers();

  return (
    <ParentPage>
      <Heading>{copy(language, "parent_title", {}, CATEGORY)}</Heading>
      <p>{copy(language, "parent_promise", {}, CATEGORY)}</p>
      <p>{copy(language, "parent_guardian", {}, CATEGORY)}</p>
      {providerProblem !== null && (
        <Notice role="alert" data-provider-problem>
          {copy(language, providerProblem, {}, CATEGORY)}
        </Notice>
      )}
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
          {providers.length > 0 && (
            <div className="flex w-full flex-col gap-3" data-providers>
              <p className="text-center text-jw-ink-soft">
                {copy(language, "parent_or", {}, CATEGORY)}
              </p>
              {providers.map((provider) => (
                <Button
                  key={provider}
                  type="button"
                  variant="outline"
                  size="control"
                  disabled={busy}
                  onClick={() => continueWith(provider)}
                  data-provider={provider}
                >
                  {copy(language, PROVIDER_LABEL[provider], {}, CATEGORY)}
                </Button>
              ))}
            </div>
          )}
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
                  <Tiles results={results} language={language} />
                  <Link asChild size="small">
                    <NavLink
                      href={assignmentPath({ assignment: attempt.assignment_id, lang: pageLang() })}
                      data-overview-link
                    >
                      {copy(language, "parent_overview_link", {}, CATEGORY)}
                    </NavLink>
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

/** A lesson's tiles: one per planned question, its twins folded in, as the heatmap draws its row.
 * Each keeps the stored ended on its item. */
function Tiles({
  results,
  language,
}: {
  results: AttemptResult[];
  language: Language;
}): ReactElement {
  return (
    <ol className="flex flex-wrap gap-2 pt-1" data-lesson-tiles>
      {cellsOf(results).map((cell, index) => (
        <li
          key={cell.planned.seq}
          data-seq={cell.planned.seq}
          data-ended={cell.planned.ended ?? "open"}
        >
          <OutcomeTile
            size="sm"
            tone={OUTCOME_TONE[cell.outcome]}
            outcome={cell.outcome}
            icon={<OutcomeIcon outcome={cell.outcome} />}
            label={tileLabel(language, index + 1, cell)}
          >
            {cell.twin && (
              <span className="absolute top-0.5 right-0.5">
                <TwinMark />
              </span>
            )}
          </OutcomeTile>
        </li>
      ))}
    </ol>
  );
}
