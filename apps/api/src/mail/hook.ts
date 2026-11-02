/**
 * Supabase Auth's Send Email Hook (dl-liwi.33, decision dl-h25k5). Supabase POSTs each auth mail
 * here, signed with Standard Webhooks, instead of sending it itself; this checks the signature,
 * picks the language, renders the mail and sends it through SES From `AUTH_EMAIL_FROM`. The
 * answer is `{}` with 200, or `{error: {http_code, message}}`, the shape Supabase's examples use.
 * https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
 *
 * No address, code or body is ever logged: a sent mail logs its kind, its language and SES's id.
 */
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { AuthEmailAction, AuthEmailHook } from "@jadwigo/contracts";
import { Webhook } from "standardwebhooks";
import { type ReadParameter, readSsm, sendEmailHookSecretParam } from "../config.ts";
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
  /** Where the log line goes; stdout by default. */
  readonly log?: (line: string) => void;
}

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
      new Webhook(secret).verify(raw, wanted);
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
  const sends = deliveries(hook, action.data);
  if (sends.some((s) => !/^\d{6}$/.test(s.token)))
    return failed(400, "the hook carries no 6-digit code");

  // One JSON line on stderr, as every api log is; its `level` says what it is.
  const log = deps.log ?? ((line: string) => console.error(line));
  for (const { to, token } of sends) {
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
    } catch (error) {
      const name = error instanceof Error ? error.name : typeof error;
      log(
        JSON.stringify({
          level: "ERROR",
          message: "auth mail failed",
          action: action.data,
          language,
          error: name,
        }),
      );
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
 * read), and SES in the Lambda's own region. Undefined when the parameter is unset, so the route
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
    readSecrets() {
      secrets ??= read(param);
      secrets.catch(() => {
        secrets = undefined;
      });
      return secrets;
    },
  };
}
