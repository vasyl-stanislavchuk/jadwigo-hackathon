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
 *   consented    no authorization_id in the details: straight on to its redirect URL
 */

import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, Heading, Notice, Page, Spinner } from "@jadwigo/ui";
import type { AuthOAuthServerApi } from "@supabase/supabase-js";
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
    <Page width="prose" data-parent data-oauth-consent>
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

  useEffect(() => {
    if (auth === null) return;
    let live = true;
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
        // Already consented: Supabase hands back where to go.
        if (!("authorization_id" in data)) return go(data.redirect_url);
        setView({ kind: "ask", ask: { app: data.client.name, host: hostOf(data.redirect_uri) } });
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
          setReturned(null);
          setSignedIn(true);
        }}
      />
    );
  if (view.kind === "failed")
    return (
      <ConsentPage>
        <Notice role="alert" data-consent-failed>
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

  const { app, host } = view.ask;
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
      <div className="flex w-full flex-col gap-3">
        <Button
          type="button"
          size="control"
          disabled={busy}
          onClick={() => decide(true)}
          data-consent-approve
        >
          {copy(language, "oauth_approve", {}, CATEGORY)}
        </Button>
        <Button
          type="button"
          size="control"
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
