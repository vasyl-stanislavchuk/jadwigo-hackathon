# Can Supabase Auth be the OAuth 2.1 server a parent's AI app signs in through to reach Jadwigo's remote MCP?

Issue: `dl-1u6fn.1`

## The answer in 5 lines

1. Yes. Supabase Auth's OAuth 2.1 server (beta, free on every plan) does dynamic client registration, S256 PKCE, refresh-token rotation and RFC 8414 metadata. It is off on both projects today, and 3 settings switch it on.
2. The issuer is `https://<ref>.supabase.co/auth/v1`, not `auth.jadwigo.pl`. The protected-resource metadata names it exactly, and clients find the server's metadata at `https://<ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1`.
3. An OAuth token is an ordinary Supabase access token, plus `client_id` and `scope` claims: same `iss`, `aud: "authenticated"`, RS256 key and `sub`. Our custom access token hook runs for it unchanged, so it carries `pod_id`, and `apps/api`'s verifier accepts it as it is.
4. Two gaps, both settled by the owner: `aud` never names the MCP server (Supabase ignores the `resource` parameter for it), so `/api/mcp` accepts any valid token from our issuer, a departure from the MCP spec the owner accepted; and a revoked app keeps its current access token until `exp` (1 hour by default).
5. The consent page calls `supabase.auth.oauth.getAuthorizationDetails`, `approveAuthorization` and `denyAuthorization` (supabase-js 2.118.0, already installed). A parent revokes an app with `auth.oauth.listGrants()` and `revokeGrant({ clientId })`.

## Method

Read:

- Supabase's guides: [OAuth 2.1 server](https://supabase.com/docs/guides/auth/oauth-server), [Getting started](https://supabase.com/docs/guides/auth/oauth-server/getting-started), [OAuth flows](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows), [Token security and RLS](https://supabase.com/docs/guides/auth/oauth-server/token-security), [MCP authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
- Supabase Auth's source at commit `a7e97d66` (master, 2026-11-02), for what the guides leave out: [`internal/api/api.go`](https://github.com/supabase/auth/blob/master/internal/api/api.go) (routes), [`internal/api/oauthserver/handlers.go`](https://github.com/supabase/auth/blob/master/internal/api/oauthserver/handlers.go), [`authorize.go`](https://github.com/supabase/auth/blob/master/internal/api/oauthserver/authorize.go), [`service.go`](https://github.com/supabase/auth/blob/master/internal/api/oauthserver/service.go), [`internal/tokens/service.go`](https://github.com/supabase/auth/blob/master/internal/tokens/service.go), [`internal/hooks/v0hooks/v0hooks.go`](https://github.com/supabase/auth/blob/master/internal/hooks/v0hooks/v0hooks.go), [`internal/api/jwks.go`](https://github.com/supabase/auth/blob/master/internal/api/jwks.go)
- The [MCP authorization spec, 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
- The clients: Claude's [connector authentication](https://claude.com/docs/connectors/building/authentication), [Claude Code's MCP page](https://code.claude.com/docs/en/mcp), OpenAI's [Apps SDK auth](https://developers.openai.com/apps-sdk/build/auth)
- The [Management API's OpenAPI document](https://api.supabase.com/api/v1-json), for the setting names
- Ours: `apps/api/src/auth.ts`, `supabase/migrations/20261101200000_token_pod_id.sql`, `infra/supabase-auth/{dev,prod}.json`, `auth.sh`, `domain.sh`, `docs/research/parent-login.md`, `node_modules/@supabase/auth-js@2.118.0` types

Run: 4 unauthenticated GETs of each project's public discovery documents (results below). Nothing else.

Not run: no Supabase setting was changed, no client was registered, nobody signed in, and no OAuth token was minted. Switching the server on is the owner's step (`dl-1u6fn.6`). Every claim about a token or a client's behaviour is from Supabase's source and the clients' docs, and is marked **unverified** until the owner's run in "Steps for the owner" observes it.

## Findings

### Switching it on

Both projects answer `404 {"error_code":"feature_disabled","msg":"OAuth server is disabled"}` at `/.well-known/oauth-authorization-server/auth/v1` today (observed 2026-11-02, dev `jweuvslwntdimuwcvlzq` and prod `xhzkmpainwzrfktxffjv`).

The Management API's auth config has exactly 3 settings for it, which `infra/supabase-auth/<env>.json` can own like the others:

| Setting | Value |
| --- | --- |
| `oauth_server_enabled` | `true` |
| `oauth_server_allow_dynamic_registration` | `true` |
| `oauth_server_authorization_path` | `/oauth/consent` |

The consent URL is `site_url` + the path ([Getting started](https://supabase.com/docs/guides/auth/oauth-server/getting-started)). Prod's `site_url` is `https://app.jadwigo.pl`, so its consent URL is `https://app.jadwigo.pl/oauth/consent`. **Dev's `site_url` is `http://127.0.0.1:5173`, so dev's consent page is the local web app (`make dev`)**, not app.jadwigo.pl, unless `dl-1u6fn.6` also changes dev's `site_url`.

### Dynamic client registration

- `POST https://<ref>.supabase.co/auth/v1/oauth/clients/register`, public and rate-limited; `403 oauth_dynamic_client_registration_disabled` while the switch is off (`handlers.go` `OAuthServerClientDynamicRegister`, `api.go`). The metadata names it as `registration_endpoint` only when the switch is on (`jwks.go`).
- Redirect URIs: 1 to 10, absolute, no fragment; `http` only for `localhost`, `127.0.0.1` and `::1` (`service.go` `validateRedirectURI`). Matching at `/authorize` is **exact, port included** (`authorize.go` `isValidRedirectURI`).
- Grant types: `authorization_code` and `refresh_token` only. Auth methods: `none`, `client_secret_basic`, `client_secret_post`. PKCE is mandatory, S256.
- No Client ID Metadata Document (CIMD) support: the metadata has no `client_id_metadata_document_supported`, so every client below falls back to DCR.
- Scopes are OIDC only (`openid email profile phone offline_access`). There are no custom scopes, and every OAuth token has the user's full rights ([OAuth flows](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows)).

Per client (from their docs; **unverified** against our project):

| Client | How it registers | Redirect URI it registers | Fit |
| --- | --- | --- | --- |
| claude.ai, Desktop, mobile | DCR, a new public client on every fresh connection | `https://claude.ai/api/mcp/auth_callback` | Fits. Expect many registered clients over time |
| ChatGPT | DCR when no CIMD, once per connection; sends `resource` on authorize and token | `https://chatgpt.com/connector/oauth/{callback_id}` (Supabase does not advertise `authorization_response_iss_parameter_supported`) | Fits. It requests every advertised OIDC scope; `openid` needs RS256 signing, which both projects use |
| Claude Code | DCR on a random loopback port, `http://localhost:<port>/callback` | that exact URI | Fits for one sign-in. A later re-auth on another port fails Supabase's exact match unless Claude Code re-registers; `claude mcp add --transport http --callback-port <n>` pins the port |

### The issuer and the metadata URL (for lane `mcp`, `dl-1u6fn.8`)

Observed in each project's `/auth/v1/.well-known/openid-configuration` today:

```json
{ "issuer": "https://<ref>.supabase.co/auth/v1",
  "authorization_endpoint": "https://<ref>.supabase.co/auth/v1/oauth/authorize",
  "token_endpoint": "https://<ref>.supabase.co/auth/v1/oauth/token",
  "jwks_uri": "https://<ref>.supabase.co/auth/v1/.well-known/jwks.json" }
```

Every endpoint is built from `config.JWT.Issuer` (`jwks.go`), so the issuer stays the `supabase.co` one even with prod's custom domain `auth.jadwigo.pl`, which is also the `iss` the API Gateway authorizer pins (`infra/supabase-auth/domain.sh`). The epic's "naming auth.jadwigo.pl" is wrong: RFC 8414 and ChatGPT require the `authorization_servers` entry to equal the metadata's `issuer` exactly.

So `/.well-known/oauth-protected-resource` serves:

```json
{ "resource": "https://app.jadwigo.pl/api/mcp",
  "authorization_servers": ["https://xhzkmpainwzrfktxffjv.supabase.co/auth/v1"],
  "bearer_methods_supported": ["header"] }
```

with the dev ref on dev, read from `AUTH_ISSUER` (already in `apps/api/src/config.ts`), never retyped. A client derives `https://<ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1` from it (RFC 8414 path insertion), the URL Supabase documents. `resource` must equal the URL the parent types, path included (Claude's docs). The 401 is `WWW-Authenticate: Bearer resource_metadata="https://app.jadwigo.pl/.well-known/oauth-protected-resource"`. No `scopes_supported`: Supabase has no custom scope to name, and Claude then asks for the server's own scopes plus `offline_access`.

### The token's claims (for lane `mcp`)

`GenerateAccessToken` (`internal/tokens/service.go`) mints every access token, browser and OAuth alike. For an OAuth token (**unverified** until observed):

| Claim | Value |
| --- | --- |
| `iss` | `https://<ref>.supabase.co/auth/v1`, the same as `AUTH_ISSUER` today |
| `aud` | `"authenticated"` (the user's `aud`). **Not** the MCP URL: `resource` is checked against the code at the token endpoint, then dropped |
| `sub` | the Supabase user id, the key of `account` |
| `client_id` | the OAuth client's uuid; absent on a browser token |
| `scope` | the granted scopes, for example `"email offline_access"` |
| `role`, `session_id`, `aal`, `amr`, `email` | as on a browser token |
| `pod_id` | added by our hook (next section) |
| alg | RS256, the project's key, the JWKS `apps/api` already reads |

So `apps/api/src/auth.ts`'s `verifyToken` accepts an OAuth token with no change, and the API Gateway JWT authorizer on the REST token routes does too.

The MCP spec says a server MUST check that a token was issued for it as the audience. Supabase can't put the resource in `aud`. **The owner decided `/api/mcp` accepts any valid token from our issuer, the parent's own browser token included, with the same rights as the parent, and logs the token's `client_id` on each call** (`jadwigo-hackathon/decisions/2026-11-02-an-ai-app-s-oauth-token-has-the-same-rights-as-the-parent-s-own`; built in #721).

**This departs from the MCP spec's MUST on audience validation, and the owner accepted it.** The check exists to stop a token meant for one resource server being replayed at another. Here that risk is absent: Jadwigo's API is the only resource server that trusts this issuer, so there is no other audience a token could have been meant for; and an OAuth token is issued only to a client the parent approved on our own consent page. A token reaching `/api/mcp` therefore already speaks for the parent, and the API gives it nothing the parent's own sign-in doesn't. Every tool call still goes through `authorize()` with the token's `sub`, scoped to the parent's pod by RLS, as the REST routes do.

### The custom access token hook runs for OAuth tokens

Yes. `GenerateAccessToken` calls the hook whenever `hook_custom_access_token_enabled` is on, with no branch on how the token was asked for. Supabase's [token security guide](https://supabase.com/docs/guides/auth/oauth-server/token-security) says hooks "are triggered for all token issuance". The event is `{ "user_id", "claims", "authentication_method" }` (`v0hooks.go`), with `client_id` inside `claims` and `authentication_method` `oauth_provider/authorization_code` at the exchange or `token_refresh` after. `app.custom_access_token` reads only `user_id` and `claims`, and adds `pod_id` only, so it needs no change, and Supabase's required-claims check still passes. A parent with no account yet gets no `pod_id`, as in the browser. **Unverified** until a real OAuth token is decoded.

### The consent page's API (for `dl-1u6fn.7`)

Supabase redirects the browser to `<site_url>/oauth/consent?authorization_id=<id>`. The page, signed in as the parent (the email code or Google as today; send them to sign in and back with the id kept), calls supabase-js 2.118.0:

| Call | HTTP | Gives |
| --- | --- | --- |
| `supabase.auth.oauth.getAuthorizationDetails(id)` | `GET /auth/v1/oauth/authorizations/{id}` | `client.name`, `redirect_uri`, `scope` (one space-separated string). No `authorization_id` in the answer means the parent already consented: go to its `redirect_url` |
| `supabase.auth.oauth.approveAuthorization(id, { skipBrowserRedirect })` | `POST …/{id}/consent` `{ "action": "approve" }` | `redirect_url` with the code |
| `supabase.auth.oauth.denyAuthorization(id, …)` | `POST …/{id}/consent` `{ "action": "deny" }` | `redirect_url` with `access_denied` |

Both refuse an `Origin` outside `site_url` and `uri_allow_list` (`authorize.go` `validateRequestOrigin`), so the page must run on app.jadwigo.pl (prod) or the local web app (dev). The page names the app by `client.name`, which the client chose itself at DCR, so it also shows `redirect_uri`'s host: the MCP spec asks for it, and it is the one part a client can't fake. An authorization request lives 10 minutes.

### Refresh and revocation

- Refresh: `POST /auth/v1/oauth/token` with `grant_type=refresh_token`. Refresh tokens rotate; the hook runs again, so `pod_id` stays current.
- A parent revokes an app with `supabase.auth.oauth.listGrants()` (`GET /auth/v1/user/oauth/grants`) and `revokeGrant({ clientId })` (`DELETE /auth/v1/user/oauth/grants?client_id=`). It marks the consent revoked and deletes that client's sessions for the user, so the refresh token dies (`handlers.go` `UserRevokeOAuthGrant`). No page offers it yet.
- **The access token already issued stays valid until `exp`.** It is a stateless JWT, and `apps/api` checks only its signature and claims. The owner decided a revoked app keeps its current access token until it expires, up to 1 hour by default, with no per-call session check (`jadwigo-hackathon/decisions/2026-11-02-a-revoked-ai-app-keeps-its-current-access-token-until-it-expires`). The epic's "revoking makes the next call 401" holds from the next refresh, not the next call.
- There is no RFC 7009 `/oauth/revoke` endpoint, so `claude mcp logout` revokes nothing at Supabase.

### Dynamic registration abuse

Registration is public: anyone who finds the endpoint can create clients, limited only by Supabase's rate limit (`api.go`, `limitHandler(OAuthClientRegister)`). Two things follow.

- **Clients pile up.** claude.ai registers a new client on every fresh connection (Claude's docs), and Supabase has no cap on clients and no expiry for one nobody approved. Nothing removes them. The admin API lists and deletes clients (`GET`/`DELETE /auth/v1/admin/oauth/clients`), so a script can show the pile and prune dynamic clients with no active grant: filed as `dl-1u6fn.21`.
- **Names are spoofable.** `client_name` is whatever the registrant sent, so a client can call itself "Claude" or "ChatGPT". A registered client still gets nothing without a parent's approval on our consent page, and its code goes only to a redirect URI it registered. So the consent page shows the redirect URI's host beside the name (`dl-1u6fn.7`): `claude.ai`, `chatgpt.com` or `localhost` is what tells a parent who is really asking. A loopback-only client gets a line that it is a program on this computer.

### What an OAuth token reaches besides the MCP

The token is a full Supabase user token. With no custom scopes, the parent's AI app can also call `/api/v1` token routes (writes included), Realtime and the Supabase Data API with the parent's RLS rights, not only the MCP tools. The owner decided that is intended: an AI app's token has the same rights as the parent's own, writes through `/api/v1` included (`jadwigo-hackathon/decisions/2026-11-02-an-ai-app-s-oauth-token-has-the-same-rights-as-the-parent-s-own`). Reads were already in scope by `dl-jf6wy` (`jadwigo-hackathon/decisions/2026-11-02-the-remote-mcp-reads-everything-a-parent-can-read-in-the-app-and`). So the consent page says plainly that the app gets all the family's and the children's data and can act as the parent.

## What this means for jadwigo

- `dl-1u6fn.6` (owner): set the 3 settings in `infra/supabase-auth/dev.json`, run `auth.sh diff dev`, `auth.sh apply dev`, then the steps below. Dev's consent URL is `http://127.0.0.1:5173/oauth/consent` unless dev's `site_url` changes. Prod later, the same 3 keys.
- `dl-1u6fn.8` (lane `mcp`): `authorization_servers: [AUTH_ISSUER]`; verify with the existing `verifyToken` (`iss` = `AUTH_ISSUER`, `aud` = `authenticated`); no `client_id` requirement and no audience check beyond `aud` = `authenticated` (`jadwigo-hackathon/decisions/2026-11-02-an-ai-app-s-oauth-token-has-the-same-rights-as-the-parent-s-own`), so the departure from the spec is the owner's, written down; log `client_id` (absent for a browser token) on each call; every tool goes through `authorize()` with `sub` and reads `pod_id` as today. The 401 carries `resource_metadata`.
- `dl-1u6fn.7` (consent page): the 3 calls above, with the client's name and its redirect host, and a sign-in detour that keeps `authorization_id`.
- `dl-1u6fn.14`: a parent's "connected apps" list with a revoke button, over `listGrants` and `revokeGrant`. Without it a parent can't take access back.
- `dl-1u6fn.21`: list and prune dynamically registered clients no parent approved.
- The epic's design: "naming auth.jadwigo.pl" becomes "naming `AUTH_ISSUER`, the `supabase.co` issuer".

### Steps for the owner (turn the unverified facts into observed ones, dev only)

After `auth.sh apply dev`:

1. `curl -s https://jweuvslwntdimuwcvlzq.supabase.co/.well-known/oauth-authorization-server/auth/v1 | jq '{issuer,registration_endpoint,code_challenge_methods_supported}'`: expect the issuer above and a `registration_endpoint`.
2. `make dev`, then `npx @modelcontextprotocol/inspector`, Auth settings, pointed at the metadata above (or, once `dl-1u6fn.8` lands, at `/api/mcp`): it registers, sends you to `/oauth/consent` (404 until `dl-1u6fn.7`), and on approve gets a token.
3. Decode the access token's payload (not the signature) with `cut -d. -f2 | base64 -d` and record `iss`, `aud`, `client_id`, `scope` and whether `pod_id` is there, with `sub`, email and ids redacted, in this note.
4. Revoke with `revokeGrant` from the browser console on the web app, then refresh: expect `invalid_grant`, and the old access token still accepted until `exp`.

## Decided by the owner

The 3 questions this note raised are settled:

1. **The audience.** `/api/mcp` accepts any valid token from our issuer, with the parent's rights, and logs `client_id` per call. A departure from the MCP spec's audience MUST, accepted (`jadwigo-hackathon/decisions/2026-11-02-an-ai-app-s-oauth-token-has-the-same-rights-as-the-parent-s-own`).
2. **Revocation lag.** A revoked app keeps its current access token until it expires (`jadwigo-hackathon/decisions/2026-11-02-a-revoked-ai-app-keeps-its-current-access-token-until-it-expires`).
3. **What the AI app's token reaches.** The same rights as the parent's own, writes through `/api/v1` included (`jadwigo-hackathon/decisions/2026-11-02-an-ai-app-s-oauth-token-has-the-same-rights-as-the-parent-s-own`).

```json jadwigo-outcome
{
  "issue": "dl-1u6fn.1",
  "question": "Can Supabase Auth be the OAuth 2.1 server a parent's AI app signs in through to reach Jadwigo's remote MCP?",
  "answer": "Yes: it does DCR, S256 PKCE and rotating refresh tokens, its issuer is https://<ref>.supabase.co/auth/v1, and its OAuth tokens are ordinary Supabase tokens plus client_id and scope that our hook gives pod_id. Gaps, settled by the owner: aud is always 'authenticated', so /api/mcp accepts any valid token from our issuer (a departure from the MCP spec's audience MUST, accepted), and a revoked app keeps its access token until exp. Not yet observed: the server is off on both projects.",
  "status": "partial",
  "sources": [
    "https://supabase.com/docs/guides/auth/oauth-server/getting-started",
    "https://supabase.com/docs/guides/auth/oauth-server/oauth-flows",
    "https://supabase.com/docs/guides/auth/oauth-server/token-security",
    "https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication",
    "https://github.com/supabase/auth/blob/master/internal/tokens/service.go",
    "https://github.com/supabase/auth/blob/master/internal/api/oauthserver/handlers.go",
    "https://github.com/supabase/auth/blob/master/internal/api/oauthserver/authorize.go",
    "https://github.com/supabase/auth/blob/master/internal/api/jwks.go",
    "https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization",
    "https://claude.com/docs/connectors/building/authentication",
    "https://code.claude.com/docs/en/mcp",
    "https://developers.openai.com/apps-sdk/build/auth",
    "https://api.supabase.com/api/v1-json",
    "supabase/migrations/20261101200000_token_pod_id.sql",
    "apps/api/src/auth.ts"
  ],
  "owner_decisions": [],
  "proposed_issues": [
    {
      "title": "web: a parent's connected AI apps, listed with a revoke button",
      "scope": "apps/web parent settings: supabase.auth.oauth.listGrants() shows each connected app (client_name, created_at), and revokeGrant({ clientId }) takes access back; copy in pl and en. No API or contract change.",
      "done_when": "A component test lists 2 grants from a stubbed client and calls revokeGrant with the right clientId; make check is green",
      "depends_on": ["dl-1u6fn.7"],
      "labels": ["project:jadwigo-learner-experience", "mcp", "auth"]
    },
    {
      "title": "auth: see and prune dynamically registered OAuth clients that no parent approved",
      "scope": "infra/supabase-auth/clients.sh: list (read-only) over the admin clients API; prune (the owner's) deletes dynamic clients older than 30 days with no active grant. Filed as dl-1u6fn.21.",
      "done_when": "Its test against a fake admin API lists 3 clients and prune deletes only the old dynamic one with no grant; make check is green",
      "depends_on": ["dl-1u6fn.6"],
      "labels": ["project:jadwigo-platform", "mcp", "auth"]
    }
  ],
  "page_changes": [
    {
      "section": "Epic dl-1u6fn design, Architecture, Auth",
      "change": "The protected-resource metadata names AUTH_ISSUER (https://<ref>.supabase.co/auth/v1), not auth.jadwigo.pl"
    },
    {
      "section": "Epic dl-1u6fn acceptance",
      "change": "Revoking a grant makes the next refresh fail; the current access token works until exp (decision a-revoked-ai-app-keeps-its-current-access-token-until-it-expires)"
    },
    {
      "section": "dl-1u6fn.6",
      "change": "The 3 Management API settings, and dev's consent URL is http://127.0.0.1:5173/oauth/consent while dev's site_url is local"
    }
  ]
}
```
