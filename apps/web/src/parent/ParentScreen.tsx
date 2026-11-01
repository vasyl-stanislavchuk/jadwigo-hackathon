/**
 * The parent's screens at /parent (dl-e8ov.2.38, docs/research/parent-login.md):
 *
 *   signed out   email, then the 6-digit code, in this tab; or Google or Facebook, which leave the
 *                tab and come back to it with ?code= (dl-e8ov.2.51), or with an error the page
 *                answers with a line that offers the email code. In Facebook's, Messenger's or
 *                Instagram's own browser, where Google refuses to sign in, a line and the link to
 *                open in the phone's browser stand in Google's place (dl-e8ov.2.63)
 *   signed in    GET /me; with no account yet, POST /accounts once (it is idempotent)
 *     consent    while the pod has no ai_consent_at, the AI's consent screen, once (dl-z5ja.32,
 *                dl-xo0q); "Nie teraz" steps past it for this visit
 *     ?claim     the tab still holds an attempt of that assignment: pick the child, or add one,
 *                and POST /attempts/{id}/claims; the tab then forgets the attempt
 *     the shell  every signed-in page sits in the parent app's frame (shell/ParentShell.tsx, decision
 *                dl-xo0q): the sidebar with Lekcje, Historia, the children and the account, and a top
 *                bar with the breadcrumb only. A child is never a gate: with none, the page still
 *                opens, and the sidebar's "+" adds one
 *     home       "Lekcje / Nowa lekcja": for now each child's card, with their lessons, newest first
 *                (each a card with a link to its attempt page, the day, a tile per question as the
 *                overview's heatmap draws that attempt's row, and a link to the overview); the
 *                first screen's box replaces it (dl-uukj.47.2), and the cards move to the child's
 *                page (dl-uukj.47.3)
 *   /parent/children/<learner>, /parent/lessons, /parent/history: the shell's pages (route.ts)
 *   /parent/attempts/<attempt>, signed in: that lesson, question by question (AttemptReview.tsx)
 *   /parent/assignments/<assignment>, signed in: every attempt at that lesson against its
 *                questions (overview/AssignmentOverview.tsx)
 *
 * The page is for the adult, so it has no lesson frame around it: an app page on the kit (Page,
 * Heading, Field, Card, Notice), in the adult's lines (dl-uukj.32 wave 2).
 */

import {
  ApiError,
  type Client,
  createClient,
  type ParentClient,
  type PodClient,
} from "@jadwigo/api-client";
import type { AssignmentId, AttemptId, LearnerId, Me } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, type Crumb, Field, Heading, Input, Notice, Page, Spinner } from "@jadwigo/ui";
import {
  type FormEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { setPodLanguage } from "../nav/language.ts";
import { navigate, useLocation } from "../nav/location.ts";
import { storedAttempt } from "../play/storedAttempt.ts";
import { ConsentScreen } from "../playground/chat/ConsentScreen.tsx";
import { AttemptReview } from "./AttemptReview.tsx";
import { CATEGORY, pageLang } from "./adult.ts";
import {
  type Auth,
  browserAuth,
  type Provider,
  type RedirectOutcome,
  withoutReturn,
} from "./auth.ts";
import { ChildPage } from "./child/ChildPage.tsx";
import { Failed } from "./Failed.tsx";
import { inAppBrowser } from "./inApp.ts";
import { LanguagePick } from "./LanguagePick.tsx";
import { AddChildDialog } from "./newLesson/AddChildDialog.tsx";
import { DlaSelect } from "./newLesson/DlaSelect.tsx";
import { NewLessonBox } from "./newLesson/NewLessonBox.tsx";
import { AssignmentOverview } from "./overview/AssignmentOverview.tsx";
import { ProviderButton } from "./ProviderButton.tsx";
import {
  childPath,
  claimOf,
  emailOf,
  forOf,
  historyPath,
  learnerOf,
  lessonsPath,
  type ParentRoute,
  parentRoute,
  providerOf,
} from "./route.ts";
import { ParentShell } from "./shell/ParentShell.tsx";
import type { Place } from "./shell/Sidebar.tsx";
import { DetailsPanel } from "./workspace/DetailsPanel.tsx";
import { LessonFooter } from "./workspace/LessonFooter.tsx";
import { Workspace } from "./workspace/Workspace.tsx";

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

export function ParentScreen({
  language,
  query,
  auth = browserAuth(),
  client,
  pods,
}: {
  language: Language;
  query: URLSearchParams;
  /** The sign-in, for tests; the build's Supabase project when absent, or none. */
  auth?: Auth | null;
  /** The API, for tests; the page's own origin, with the sign-in's token, when absent. */
  client?: ParentClient;
  /**
   * The pod's consent to the AI (dl-z5ja.32), for tests; the page's own client when `client` is
   * absent. With a test's `client` and no `pods`, the consent screen is not asked.
   */
  pods?: PodClient;
}): ReactElement {
  const own = useMemo<Client>(
    () => createClient({ base: "", token: () => auth?.token() ?? Promise.resolve(null) }),
    [auth],
  );
  const api: ParentClient = client ?? own;
  const podApi: PodClient | null = pods ?? (client ? null : own);
  const route = parentRoute(useLocation().path);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [returned, setReturned] = useState<CopyKey | null>(null);
  // The URL the page opened at. completeRedirect takes the return off the address bar, so a second
  // run of the effect (dev StrictMode) reads it here, gets the first exchange's outcome, and still
  // shows its line.
  const arrivedAt = useRef(window.location.href);
  useEffect(() => {
    if (auth === null) return;
    let live = true;
    // A return from Google or Facebook first: its code becomes the session the token reads.
    auth
      .completeRedirect(new URL(arrivedAt.current))
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
        handoff={{ provider: providerOf(query), email: emailOf(query) }}
        onSignedIn={() => {
          setReturned(null);
          setSignedIn(true);
        }}
      />
    );
  return (
    <SignedIn
      api={api}
      pods={podApi}
      language={language}
      route={route ?? { kind: "home" }}
      learner={learnerOf(query)}
      forLearner={forOf(query)}
      claim={claimOf(query)}
      onSignOut={() => {
        auth.signOut().finally(() => {
          setPodLanguage(null);
          setSignedIn(false);
        });
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
  handoff,
  onSignedIn,
}: {
  auth: Auth;
  language: Language;
  /** The line a provider's return left, or null. */
  returned: CopyKey | null;
  /** What jadwigo.pl/zaloguj asked for: a provider to start, or an address to send the code to. */
  handoff: { provider: Provider | null; email: string | null };
  onSignedIn: () => void;
}): ReactElement {
  const [providerProblem, setProviderProblem] = useState<CopyKey | null>(returned);
  const [email, setEmail] = useState(handoff.email ?? "");
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
    sendTo(email.trim());
  };

  const sendTo = (to: string): void => {
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

  // A provider's button shows once the project says it is on: none while that is read, or if it
  // cannot be (dl-e8ov.2.83). The email code is always there.
  const [providers, setProviders] = useState<readonly Provider[]>([]);
  useEffect(() => {
    let live = true;
    auth.enabledProviders().then(
      (enabled) => live && setProviders(enabled),
      () => live && setProviders([]),
    );
    return () => {
      live = false;
    };
  }, [auth]);
  const inApp = inAppBrowser(navigator.userAgent);

  // The hand-over from jadwigo.pl/zaloguj runs once: its parameters leave the address bar first, so
  // a reload or a provider's return never starts it again. A provider starts only once its button
  // would show, and not after a return that failed.
  const handedOver = useRef(false);
  useEffect(() => {
    if (handedOver.current || (handoff.provider === null && handoff.email === null)) return;
    const here = new URL(window.location.href);
    window.history.replaceState(window.history.state, "", withoutReturn(here));
    if (handoff.email !== null) {
      handedOver.current = true;
      sendTo(handoff.email);
      return;
    }
    const provider = handoff.provider;
    if (provider === null || returned !== null || !providers.includes(provider)) return;
    if (provider === "google" && inApp) return;
    handedOver.current = true;
    continueWith(provider);
    // biome-ignore lint/correctness/useExhaustiveDependencies: runs once the providers are read
  }, [providers]);

  return (
    <ParentPage>
      <Heading>{copy(language, "parent_title", {}, CATEGORY)}</Heading>
      <p>{copy(language, "parent_promise", {}, CATEGORY)}</p>
      <p>{copy(language, "parent_guardian", {}, CATEGORY)}</p>
      {/* The pick the first sign-in sends as the pod's language: the screens' own, so Polish
          unless the parent came in English or picks it here (dl-uukj.33). */}
      <LanguagePick language={language} />
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
              {providers.map((provider) =>
                provider === "google" && inApp ? (
                  <OpenInBrowser key={provider} language={language} />
                ) : (
                  <ProviderButton
                    key={provider}
                    provider={provider}
                    label={copy(language, PROVIDER_LABEL[provider], {}, CATEGORY)}
                    disabled={busy}
                    onClick={() => continueWith(provider)}
                  />
                ),
              )}
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

/** Google's place in an app's own browser: why there is no button, and this page's link to open
 * in the phone's browser, where Google signs in. */
function OpenInBrowser({ language }: { language: Language }): ReactElement {
  const [copied, setCopied] = useState(false);
  const link = new URL(withoutReturn(new URL(window.location.href)), window.location.origin).href;
  const copyLink = (): void => {
    navigator.clipboard?.writeText(link).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };
  return (
    <div className="flex w-full flex-col gap-3" data-open-in-browser>
      <Notice>{copy(language, "parent_google_in_app", {}, CATEGORY)}</Notice>
      <Button type="button" variant="outline" size="control" onClick={copyLink} data-copy-link>
        {copy(language, copied ? "parent_link_copied" : "parent_copy_link", {}, CATEGORY)}
      </Button>
    </div>
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
  pods,
  language,
  route,
  learner,
  claim,
  forLearner: forAtFirst,
  onSignOut,
}: {
  api: ParentClient;
  pods: PodClient | null;
  language: Language;
  route: ParentRoute;
  /** The attempt page's ?learner. */
  learner: LearnerId | null;
  claim: AssignmentId | null;
  /** ?for: the child the first screen's Dla starts at. */
  forLearner: LearnerId | null;
  onSignOut: () => void;
}): ReactElement {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [pending, setPending] = useState(() => pendingClaim(claim));
  // Dodaj dziecko is open, and from where: Dla's menu picks the new child, the "+" does not.
  const [adding, setAdding] = useState<"plus" | "dla" | null>(null);
  const [forLearner, setForLearner] = useState<LearnerId | null>(forAtFirst);
  const [soon, setSoon] = useState(false);
  const [notice, setNotice] = useState<CopyKey | null>(null);
  /** "Nie teraz" on the consent screen: asked again on the next visit, not on this one. */
  const [later, setLater] = useState(false);

  // The first sign-in's language is the one on screen then; a later pick moves the screens without
  // reading /me again.
  const languageNow = useRef(language);
  languageNow.current = language;
  const load = useCallback(() => {
    meOf(api, languageNow.current).then(
      (me) => {
        // The pod's language stands third, after ?lang and the parent's pick (nav/language.ts).
        setPodLanguage(me.pod?.language ?? null);
        setView({ kind: "ready", me });
      },
      () => setView({ kind: "failed" }),
    );
  }, [api]);
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
    // The kept lesson shows on that child's page.
    navigate(childPath({ learner, lang: pageLang() }), { replace: true });
  };

  const run = (work: () => Promise<void>): void => {
    setView({ kind: "loading" });
    work().then(load, () => setView({ kind: "failed" }));
  };

  const addChild = (firstName: string): void =>
    run(async () => {
      const { learner } = await api.createLearner({ first_name: firstName });
      await keepFor(learner.id);
    });

  /** The child the dialog created, until /me reads it back (see addFromDialog). */
  const createdChild = useRef<{
    firstName: string;
    learner: Awaited<ReturnType<ParentClient["createLearner"]>>["learner"];
  } | null>(null);

  /** Dodaj dziecko's dialog: adds the child and reads /me again with the page left as it was (the
   * box keeps its words). From Dla, Dla shows the child; with a claim waiting, it is kept for them. */
  const addFromDialog = async ({ firstName }: { firstName: string }): Promise<void> => {
    // A child created on a press whose /me read then failed is kept: pressing Dodaj again reads /me
    // again and never makes a second child of the same name.
    const kept = createdChild.current;
    const learner =
      kept !== null && kept.firstName === firstName
        ? kept.learner
        : (await api.createLearner({ first_name: firstName })).learner;
    createdChild.current = { firstName, learner };
    const me = await meOf(api, languageNow.current);
    createdChild.current = null;
    setView({ kind: "ready", me });
    if (adding === "dla") setForLearner(learner.id);
    if (pending !== null) run(() => keepFor(learner.id));
  };

  if (view.kind === "loading") return <Loading language={language} />;
  if (view.kind === "failed")
    return (
      <ParentPage>
        <Failed language={language} />
      </ParentPage>
    );

  const pod = view.me.pod;
  if (pods !== null && pod !== null && (pod.ai_consent_at ?? null) === null && !later)
    return (
      <ParentPage>
        <ConsentScreen
          language={language}
          onAgree={async () => {
            await pods.patchPod(pod.id, { ai_consented: true });
            load();
          }}
          onLater={() => setLater(true)}
        />
      </ParentPage>
    );

  const learners = view.me.learners.map((s) => s.learner);
  const t = (key: CopyKey): string => copy(language, key, {}, CATEGORY);
  const lang = pageLang();
  const lessons: Crumb = { label: t("parent_nav_lessons"), href: lessonsPath({ lang }) };
  const history: Crumb = { label: t("parent_nav_history"), href: historyPath({ lang }) };
  const newLesson: Crumb[] = [lessons, { label: t("parent_new_lesson") }];
  const shell = (place: Place, trail: readonly Crumb[], body: ReactNode): ReactElement => (
    <ParentShell
      language={language}
      learners={learners}
      place={place}
      trail={trail}
      onAddChild={() => setAdding("plus")}
      onSignOut={onSignOut}
    >
      {body}
      <AddChildDialog
        language={language}
        open={adding !== null}
        onOpenChange={(open) => !open && setAdding(null)}
        onAdd={addFromDialog}
      />
    </ParentShell>
  );

  // Keeping the tab's attempt with no child yet: the page asks for one before anything else.
  if (pending !== null && learners.length === 0)
    return shell(
      { kind: "elsewhere" },
      [{ label: t("parent_nav_children") }, { label: t("parent_add_child") }],
      <ParentPage>
        <AddChild language={language} onAdd={addChild} />
      </ParentPage>,
    );

  if (pending !== null)
    return shell(
      { kind: "lessons" },
      newLesson,
      <ParentPage>
        <Heading>{t("parent_whose")}</Heading>
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
        <Button
          type="button"
          variant="outline"
          size="control"
          className="self-start"
          onClick={() => setAdding("plus")}
          data-add-another
        >
          {t("parent_add_child")}
        </Button>
      </ParentPage>,
    );

  switch (route.kind) {
    case "lessons":
      return shell(
        { kind: "lessons" },
        [{ label: t("parent_nav_lessons") }],
        <ParentPage>
          <p className="text-jw-ink-soft" data-lessons-empty>
            {t("parent_lessons_empty")}
          </p>
        </ParentPage>,
      );
    case "lesson": {
      const child = learners.find((l) => l.id === forLearner) ?? null;
      const dla = (trigger?: ReactElement): ReactElement => (
        <DlaSelect
          language={language}
          learners={learners}
          value={forLearner}
          onChange={setForLearner}
          onAddChild={() => setAdding("dla")}
          {...(trigger === undefined ? {} : { trigger })}
        />
      );
      // The frame, with its slots waiting for the engine (dl-z5ja.108): the breadcrumb stays the
      // first screen's, as the send leaves it.
      return shell(
        { kind: "lessons" },
        newLesson,
        <Workspace
          language={language}
          chat={<p className="p-4 text-jw-ink-soft">{t("parent_chat_empty")}</p>}
          chatBand={null}
          lessonTitle={t("parent_new_lesson")}
          lesson={<p className="text-jw-ink-soft">{t("parent_lesson_empty")}</p>}
          lessonFooter={
            <LessonFooter
              language={language}
              status={copy(language, "parent_steps_ready", { done: 0, total: 0 }, CATEGORY)}
              ready={false}
              child={child}
              onSave={() => {}}
              onGive={() => {}}
            />
          }
          details={
            <DetailsPanel
              language={language}
              child={child}
              onAddChild={() => setAdding("dla")}
              changeMenu={dla}
            />
          }
          detailsFact={child?.first_name ?? t("parent_no_child")}
        />,
      );
    }
    case "history":
      return shell(
        { kind: "history" },
        [{ label: t("parent_nav_history") }],
        <ParentPage>
          <p className="text-jw-ink-soft" data-history-empty>
            {t("parent_history_empty")}
          </p>
        </ParentPage>,
      );
    case "child": {
      const child = learners.find((l) => l.id === route.learner);
      if (child === undefined)
        return shell(
          { kind: "elsewhere" },
          [{ label: t("parent_nav_children") }],
          <ParentPage>
            <Failed language={language} />
          </ParentPage>,
        );
      return shell(
        { kind: "child", learner: child.id },
        [{ label: t("parent_nav_children") }, { label: child.first_name }],
        <ChildPage
          api={api}
          learner={child}
          language={language}
          notice={notice === null ? null : t(notice)}
        />,
      );
    }
    case "attempt":
      return shell(
        { kind: "history" },
        [history, { label: t("parent_crumb_result") }],
        <AttemptReview api={api} attempt={route.attempt} learner={learner} language={language} />,
      );
    case "assignment":
      return shell(
        { kind: "lessons" },
        [lessons, { label: t("parent_crumb_overview") }],
        <AssignmentOverview api={api} assignment={route.assignment} language={language} />,
      );
    case "home":
      return shell(
        { kind: "lessons" },
        newLesson,
        <>
          {notice !== null && (
            <div className="px-4 pt-4 lg:px-6">
              <Notice>{t(notice)}</Notice>
            </div>
          )}
          <NewLessonBox
            language={language}
            learners={learners}
            forLearner={forLearner}
            onForChange={setForLearner}
            onAddChild={() => setAdding("dla")}
            // The engine's send lands with dl-z5ja.108; until then the box says it is on its way.
            onSend={() => setSoon(true)}
          />
          {soon && (
            <p className="px-4 pb-10 text-center text-jw-ink-soft" role="status" data-soon>
              {t("parent_lesson_soon")}
            </p>
          )}
        </>,
      );
  }
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
