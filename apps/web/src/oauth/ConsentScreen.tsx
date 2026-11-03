/**
 * The OAuth consent page at /oauth/consent?authorization_id=<id> (dl-1u6fn.7,
 * docs/research/mcp-oauth.md "The consent page's API"). Supabase Auth, the OAuth server for the
 * remote MCP, sends a parent here when their own AI app connects Jadwigo.
 *
 *   signed out   the parent screen's sign-in (email code, Google), on this URL, so the id stays
 *   signed in    the app's name, its redirect host (the name is the client's own pick at
 *                registration, the host is the part it can't fake), what it may do, and that the
 *                children's data, names included, goes to it (decision
 *                2026-11-02-a-child-s-data-names-included-may-go-to-the-ai-app-the-parent-co).
 *                Allow or Deny, then on to the app's redirect URL
 *                The signed-in parent's email sits above Allow, with "Not you? Sign out", which signs
 *                out and shows the sign-in on this same URL: a shared tablet keeps one parent's
 *                session, and another must not approve with it
 *   consented    no authorization_id in the details: straight on to its redirect URL, but only when
 *                the parent signed in on this page; a session saved before is signed out first,
 *                since that answer names no account to show
 */

import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, Heading, Notice, Page, Spinner } from "@jadwigo/ui";
import type { AuthOAuthServerApi } from "@supabase/supabase-js";
import { CircleAlert } from "lucide-react";
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";
import { CATEGORY } from "../parent/adult.ts";
import { type Auth, browserAuth, browserOAuth, type RedirectOutcome } from "../parent/auth.ts";
import { SignIn } from "../parent/ParentScreen.tsx";

/** The consent calls the page makes: supabase-js's `auth.oauth`. */
export type ConsentApi = Pick<
  AuthOAuthServerApi,
  "getAuthorizationDetails" | "approveAuthorization" | "denyAuthorization"
>;

/** What the parent is asked about. */
interface Ask {
  app: string;
  host: string;
  /** Who approves: the signed-in parent's email. */
  email: string;
}

type View = { kind: "loading" } | { kind: "failed" } | { kind: "ask"; ask: Ask };

const RETURN_LINE: Record<RedirectOutcome, CopyKey | null> = {
  "signed-in": null,
  none: null,
  "no-email": "parent_provider_no_email",
  failed: "parent_provider_failed",
};

function ConsentPage({ children }: { children: ReactNode }): ReactElement {
  return (
    // Signed out and asked once: the sign-in scale, the prose column at 640 (handoff §3, §12.1).
    <Page width="prose" className="max-w-160" data-parent data-size="signin" data-oauth-consent>
      {children}
    </Page>
  );
}

/** The redirect URI's host, or the URI itself when it does not parse. */
function hostOf(uri: string): string {
  try {
    return new URL(uri).host;
  } catch {
    return uri;
  }
}

/** Leaves the app for the AI app's redirect URL. */
const leave = (url: string): void => window.location.assign(url);

export function ConsentScreen({
  language,
  query,
  auth = browserAuth(),
  oauth = browserOAuth(),
  go = leave,
}: {
  language: Language;
  query: URLSearchParams;
  /** The sign-in, for tests; the build's Supabase project when absent, or none. */
  auth?: Auth | null;
  /** The consent calls, for tests; the same Supabase client's when absent. */
  oauth?: ConsentApi | null;
  /** Leaves for the AI app's redirect URL, for tests. */
  go?: (url: string) => void;
}): ReactElement {
  const id = query.get("authorization_id");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [returned, setReturned] = useState<CopyKey | null>(null);
  const [view, setView] = useState<View>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  // As on /parent: a provider's return is read off the URL the page opened at.
  const arrivedAt = useRef(window.location.href);
  // True once the parent signed in on this page (the code, or a provider's return to it), not
  // with a session saved before.
  const fresh = useRef(false);

  const signOut = (): void => {
    if (auth === null) return;
    setBusy(true);
    auth.signOut().finally(() => {
      fresh.current = false;
      setBusy(false);
      setView({ kind: "loading" });
      setSignedIn(false);
    });
  };

  useEffect(() => {
    if (auth === null) return;
    let live = true;
    auth
      .completeRedirect(new URL(arrivedAt.current))
      .catch((): RedirectOutcome => "failed")
      .then((outcome) => {
        if (live) setReturned(RETURN_LINE[outcome]);
        if (outcome === "signed-in") fresh.current = true;
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

  useEffect(() => {
    if (!signedIn || oauth === null) return;
    if (id === null) {
      setView({ kind: "failed" });
      return;
    }
    let live = true;
    oauth.getAuthorizationDetails(id).then(
      ({ data, error }) => {
        if (!live) return;
        if (error !== null || data === null) return setView({ kind: "failed" });
        // Already consented: Supabase hands back where to go, and names no account. A session
        // from before this page is signed out first, so the parent signs in as themselves.
        if (!("authorization_id" in data)) {
          if (fresh.current) return go(data.redirect_url);
          return signOut();
        }
        setView({
          kind: "ask",
          ask: { app: data.client.name, host: hostOf(data.redirect_uri), email: data.user.email },
        });
      },
      () => live && setView({ kind: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [signedIn, oauth, id, go]);

  if (auth === null || oauth === null)
    return (
      <ConsentPage>
        <Notice data-parent-off>{copy(language, "parent_off", {}, CATEGORY)}</Notice>
      </ConsentPage>
    );
  if (signedIn === false)
    return (
      <SignIn
        auth={auth}
        language={language}
        returned={returned}
        handoff={{ provider: null, email: null }}
        onSignedIn={() => {
          fresh.current = true;
          setReturned(null);
          setSignedIn(true);
        }}
      />
    );
  if (view.kind === "failed")
    return (
      <ConsentPage>
        <Notice role="alert" icon={<CircleAlert aria-hidden="true" />} data-consent-failed>
          {copy(language, "oauth_failed", {}, CATEGORY)}
        </Notice>
      </ConsentPage>
    );
  if (signedIn === null || view.kind === "loading" || id === null)
    return (
      <ConsentPage>
        <Spinner label={copy(language, "loading", {}, CATEGORY)} />
      </ConsentPage>
    );

  const decide = (approve: boolean): void => {
    if (busy) return;
    setBusy(true);
    const options = { skipBrowserRedirect: true };
    (approve ? oauth.approveAuthorization(id, options) : oauth.denyAuthorization(id, options)).then(
      ({ data, error }) => {
        if (error !== null || data === null) {
          setBusy(false);
          setView({ kind: "failed" });
        } else go(data.redirect_url);
      },
      () => {
        setBusy(false);
        setView({ kind: "failed" });
      },
    );
  };

  const { app, host, email } = view.ask;
  return (
    <ConsentPage>
      <Heading>{copy(language, "oauth_title", { app }, CATEGORY)}</Heading>
      <p className="text-jw-ink-soft" data-consent-host>
        {copy(language, "oauth_address", { host }, CATEGORY)}
      </p>
      <p>{copy(language, "oauth_can", {}, CATEGORY)}</p>
      <ul className="list-disc ps-6">
        <li>{copy(language, "oauth_can_read", {}, CATEGORY)}</li>
        <li>{copy(language, "oauth_can_lessons", {}, CATEGORY)}</li>
      </ul>
      <Notice data-consent-data>{copy(language, "oauth_data", { app }, CATEGORY)}</Notice>
      <p data-consent-as>
        {copy(language, "oauth_as", { email }, CATEGORY)}{" "}
        <Button
          type="button"
          variant="link"
          className="min-h-0 min-w-0 p-0"
          disabled={busy}
          onClick={signOut}
          data-consent-not-you
        >
          {copy(language, "oauth_not_you", {}, CATEGORY)}
        </Button>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="lg"
          disabled={busy}
          onClick={() => decide(true)}
          data-consent-approve
        >
          {copy(language, "oauth_approve", {}, CATEGORY)}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={busy}
          onClick={() => decide(false)}
          data-consent-deny
        >
          {copy(language, "oauth_deny", {}, CATEGORY)}
        </Button>
      </div>
    </ConsentPage>
  );
}
