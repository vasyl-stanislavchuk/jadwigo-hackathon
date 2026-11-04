/**
 * Supabase Auth's Send Email Hook (dl-liwi.33, decision dl-h25k5). Supabase POSTs each auth mail
 * here, signed with Standard Webhooks, instead of sending it itself; this checks the signature,
 * picks the language, renders the mail and sends it through SES From `AUTH_EMAIL_FROM`. The
 * answer is `{}` with 200, or `{error: {http_code, message}}`, the shape Supabase's examples use.
 * https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
 *
 * No address, code or body is ever logged: a sent mail logs its kind, its language and SES's id.
 *
 * Hardening (dl-e8ov.2.100): a delivery already sent for a webhook-id in the last 5 minutes is not
 * sent again, per instance (owner, 2026-11-02: no shared store); an address's domain reaches SES
 * as Punycode; a signed body that is not JSON is 400.
 */

import { domainToASCII } from "node:url";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { AuthEmailAction, AuthEmailHook } from "@jadwigo/contracts";
import { Webhook } from "standardwebhooks";
import { type ReadParameter, readSsm, sendEmailHookSecretParam } from "../config.ts";
import { reportFailure } from "../report.ts";
import { pickLanguage } from "./language.ts";
import { renderAuthEmail } from "./render.ts";

/** The one sender the api role may use (infra/terraform/modules/app/mail.tf, ses:FromAddress). */
export const AUTH_EMAIL_FROM = "Jadwigo <no-reply@jadwigo.pl>";

/** The SES call, narrowed so a test hands in a fake and nothing reaches the network. */
export interface SendEmailClient {
  send(command: SendEmailCommand): Promise<{ MessageId?: string | undefined }>;
}

export interface MailDeps {
  /**
   * The hook secrets, as Supabase shows them (`v1,whsec_<base64>`), separated by spaces: one per
   * Supabase project that calls the hook, so dev and prod each keep their own. Undefined or blank
   * means no request is ever accepted.
   */
  readonly readSecrets: () => Promise<string | undefined>;
  readonly client: SendEmailClient;
  /**
   * The deliveries this instance sent, `<webhook-id> <address>` to when it sent them, so a replay
   * or Supabase's retry of a half-sent email change sends nothing twice. Kept for `REPLAY_MS`.
   * With none, every signed request sends.
   */
  readonly sent?: Map<string, number>;
  /** The clock the memo keeps time by; `Date.now` by default. */
  readonly now?: () => number;
  /** Where a sent mail's line goes; stdout by default, so CloudWatch does not tag it ERROR. */
  readonly log?: (line: string) => void;
  /** Where a failed send's line goes; stderr by default. */
  readonly logError?: (line: string) => void;
}

/** The Standard Webhooks tolerance: a signature older than this is refused anyway. */
export const REPLAY_MS = 5 * 60 * 1000;

export interface HookReply {
  readonly status: number;
  readonly body: unknown;
}

const failed = (status: number, message: string): HookReply => ({
  status,
  body: { error: { http_code: status, message } },
});

/** The secrets in `value`, each without Supabase's `v1,` and Standard Webhooks' `whsec_`. */
export function secretsOf(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\s+/)
    .map((s) => s.replace(/^v1,/, "").replace(/^whsec_/, ""))
    .filter((s) => s !== "");
}

/** True when one of `secrets` signed `raw` with these headers, within the library's 5 minutes. */
function signed(raw: string, headers: Headers, secrets: readonly string[]): boolean {
  const wanted = {
    "webhook-id": headers.get("webhook-id") ?? "",
    "webhook-timestamp": headers.get("webhook-timestamp") ?? "",
    "webhook-signature": headers.get("webhook-signature") ?? "",
  };
  return secrets.some((secret) => {
    try {
      // jsonParse off: a signed body that is not JSON is a bad payload (400), not a bad signature.
      new Webhook(secret).verify(raw, wanted, { jsonParse: false });
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * Who gets which code. An email change with secure email change on sends 2 mails: `token` to the
 * current address and `token_new` to the new one. With it off, one mail goes to the new address
 * with whichever token is set. Every other kind is one mail to the user's address.
 */
function deliveries(hook: AuthEmailHook, action: AuthEmailAction): { to: string; token: string }[] {
  const { email, new_email } = hook.user;
  const { token, token_new } = hook.email_data;
  if (action !== "email_change") return [{ to: email, token }];
  if (new_email && token && token_new)
    return [
      { to: email, token },
      { to: new_email, token: token_new },
    ];
  return [{ to: new_email || email, token: token || token_new || "" }];
}

/**
 * `address` with its domain in ASCII, as SES needs it: a Polish-letter domain becomes its `xn--`
 * Punycode. Undefined for an address with no local part or no valid domain.
 */
export function sesAddress(address: string): string | undefined {
  const at = address.lastIndexOf("@");
  if (at <= 0) return undefined;
  const domain = domainToASCII(address.slice(at + 1).trim());
  return domain === "" ? undefined : `${address.slice(0, at).trim()}@${domain}`;
}

export async function handleSendEmail(
  raw: string,
  headers: Headers,
  deps: MailDeps,
): Promise<HookReply> {
  let secrets: string[];
  try {
    secrets = secretsOf(await deps.readSecrets());
  } catch {
    return failed(500, "the hook secret could not be read");
  }
  if (secrets.length === 0 || !signed(raw, headers, secrets))
    return failed(401, "the hook signature does not match");

  let hook: AuthEmailHook;
  try {
    hook = AuthEmailHook.parse(JSON.parse(raw));
  } catch {
    return failed(400, "the hook body is not a Send Email Hook payload");
  }
  const action = AuthEmailAction.safeParse(hook.email_data.email_action_type);
  if (!action.success) return failed(400, "this kind of auth mail is not sent");
  const language = pickLanguage(hook);
  const sends = deliveries(hook, action.data).map((d) => ({ ...d, to: sesAddress(d.to) }));
  if (sends.some((s) => !/^\d{6}$/.test(s.token)))
    return failed(400, "the hook carries no 6-digit code");
  if (sends.some((s) => s.to === undefined))
    return failed(400, "the hook carries no valid address");

  // A sent mail on stdout, where Lambda's text log does not tag it ERROR; a failure on stderr.
  const log = deps.log ?? ((line: string) => void process.stdout.write(`${line}\n`));
  const logError = deps.logError ?? ((line: string) => console.error(line));
  const now = (deps.now ?? Date.now)();
  const id = headers.get("webhook-id") ?? "";
  for (const [key, at] of deps.sent ?? []) if (now - at > REPLAY_MS) deps.sent?.delete(key);
  for (const { to, token } of sends) {
    if (to === undefined) continue;
    const key = `${id} ${to}`;
    if (deps.sent?.has(key)) continue;
    const mail = await renderAuthEmail(action.data, language, token);
    let messageId: string | undefined;
    try {
      const sent = await deps.client.send(
        new SendEmailCommand({
          FromEmailAddress: AUTH_EMAIL_FROM,
          Destination: { ToAddresses: [to] },
          Content: {
            Simple: {
              Subject: { Data: mail.subject, Charset: "UTF-8" },
              Body: {
                Html: { Data: mail.html, Charset: "UTF-8" },
                Text: { Data: mail.text, Charset: "UTF-8" },
              },
            },
          },
        }),
      );
      messageId = sent.MessageId;
      deps.sent?.set(key, now);
    } catch (error) {
      const name = error instanceof Error ? error.name : typeof error;
      logError(
        JSON.stringify({
          level: "ERROR",
          message: "auth mail failed",
          action: action.data,
          language,
          error: name,
        }),
      );
      await reportFailure(error, { operation: "auth_mail" });
      return failed(500, "the mail could not be sent");
    }
    log(
      JSON.stringify({
        level: "INFO",
        message: "auth mail sent",
        action: action.data,
        language,
        message_id: messageId,
      }),
    );
  }
  return { status: 200, body: {} };
}

/**
 * The hook in the Lambda: the secrets from the SSM SecureString `SEND_EMAIL_HOOK_SECRET_PARAM`
 * names, read on the first mail and kept for the execution environment (again after a failed
 * read), SES in the Lambda's own region, and the memo of deliveries this instance sent. Undefined when the parameter is unset, so the route
 * answers NotFound.
 */
export function lambdaMail(
  param = sendEmailHookSecretParam(),
  read: ReadParameter = readSsm,
  client: SendEmailClient = new SESv2Client({}),
): MailDeps | undefined {
  if (param === undefined) return undefined;
  let secrets: Promise<string | undefined> | undefined;
  return {
    client,
    sent: new Map(),
    readSecrets() {
      secrets ??= read(param);
      secrets.catch(() => {
        secrets = undefined;
      });
      return secrets;
    },
  };
}
