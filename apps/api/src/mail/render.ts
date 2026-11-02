import type { AuthEmailAction, Language } from "@jadwigo/contracts";
import { m } from "@jadwigo/copy/messages";
import { render } from "@react-email/render";
import { createElement } from "react";
import { AuthEmail, type AuthEmailWords } from "./AuthEmail.tsx";

/** A mail ready for SES: its subject, its HTML and the same words as plain text. */
export interface RenderedEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

type Message = (inputs: Record<string, never>, options: { locale: Language }) => string;

/** Each kind's own subject and lead, the rest shared (packages/copy, `email_*`). */
const OWN: Record<AuthEmailAction, { subject: Message; lead: Message }> = {
  signup: { subject: m.email_subject_signup, lead: m.email_lead_signup },
  magiclink: { subject: m.email_subject_magiclink, lead: m.email_lead_magiclink },
  email_change: { subject: m.email_subject_email_change, lead: m.email_lead_email_change },
  reauthentication: {
    subject: m.email_subject_reauthentication,
    lead: m.email_lead_reauthentication,
  },
  recovery: { subject: m.email_subject_recovery, lead: m.email_lead_recovery },
};

/** The words of `action`'s mail in `language`, each message called with that locale. */
function wordsOf(action: AuthEmailAction, language: Language): AuthEmailWords {
  const locale = { locale: language };
  return {
    subject: OWN[action].subject({}, locale),
    lead: OWN[action].lead({}, locale),
    codeLabel: m.email_code_label({}, locale),
    expiry: m.email_expiry({}, locale),
    ignore: m.email_ignore({}, locale),
  };
}

/** `action`'s mail in `language`, carrying `token`, rendered by React Email. */
export async function renderAuthEmail(
  action: AuthEmailAction,
  language: Language,
  token: string,
): Promise<RenderedEmail> {
  const words = wordsOf(action, language);
  const element = createElement(AuthEmail, { language, token, words });
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: words.subject, html, text };
}
