import { z } from "zod";

/** The mail kinds the hook sends, each with its own words. Any other kind is refused. */
export const AuthEmailAction = z.enum([
  "signup",
  "magiclink",
  "email_change",
  "reauthentication",
  "recovery",
]);
export type AuthEmailAction = z.infer<typeof AuthEmailAction>;

/**
 * Supabase Auth's Send Email Hook (dl-liwi.33, decision dl-h25k5): Supabase POSTs this, signed with
 * Standard Webhooks, to `AUTH_EMAIL_HOOK_PATH` (routes.ts) instead of sending the mail itself, and
 * apps/api renders it in the parent's language and sends it through SES.
 * https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
 *
 * The hook's body, only the fields the hook reads; Supabase's others pass through unread.
 * `email_action_type` is a plain string here, so a kind outside `AuthEmailAction` is refused by the
 * hook with its own message rather than as a malformed body. For `email_change` with secure email
 * change on, `token` goes to `user.email` and `token_new` to `user.new_email` (Supabase's names are
 * reversed for the hashes, which the hook never reads).
 */
export const AuthEmailHook = z.looseObject({
  user: z.looseObject({
    email: z.string(),
    new_email: z.string().optional(),
    user_metadata: z.looseObject({ language: z.unknown().optional() }).optional(),
  }),
  email_data: z.looseObject({
    token: z.string(),
    token_new: z.string().optional(),
    redirect_to: z.string().optional(),
    site_url: z.string().optional(),
    email_action_type: z.string(),
  }),
});
export type AuthEmailHook = z.infer<typeof AuthEmailHook>;
