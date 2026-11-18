/**
 * The parent's settings pages, each a whole page at /parent/settings/<section>, opened from its row
 * under Ustawienia in the sidebar or from the account menu, as a child's row opens the child's page
 * (handoff dl-uukj.47 §6: settings hold the language and the AI consent switch):
 *
 *   account    when the account was made, and signing out
 *   language   the parent pages' language, Polski or English, each named in itself (D14)
 *   ai         the pod's consent to Jadwigo AI as a switch, with what it means (dl-z5ja.32): on gives
 *              it, off withdraws it (PodPatch, dl-z5ja.112), and the words say what changes
 *
 * Each page is the prose column, its title the page's h1.
 */

import type { Me } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, Heading, Notice, Page, RadioCards, Switch } from "@jadwigo/ui";
import { CircleAlert, LogOutIcon } from "lucide-react";
import { type ReactElement, useState } from "react";
import { pickLanguage } from "../../nav/language.ts";
import { LANGUAGES } from "../../nav/location.ts";
import { CATEGORY } from "../adult.ts";
import { LANGUAGE_NAME } from "../LanguagePick.tsx";
import type { SettingsSection } from "../route.ts";
import { SETTINGS_PAGE } from "../shell/Sidebar.tsx";

const day = (language: Language, at: string): string =>
  new Intl.DateTimeFormat(language, { dateStyle: "long" }).format(new Date(at));

export function SettingsPage({
  section,
  language,
  me,
  onSignOut,
  onConsent,
}: {
  section: SettingsSection;
  language: Language;
  me: Me;
  onSignOut: () => void;
  /** Gives (true) or withdraws (false) the pod's consent; null where the page has no route to it. */
  onConsent: ((consented: boolean) => Promise<void>) | null;
}): ReactElement {
  const t = (key: CopyKey, params: Record<string, string> = {}): string =>
    copy(language, key, params, CATEGORY);
  return (
    <Page width="prose" data-parent data-settings-page={section}>
      <Heading>{t(SETTINGS_PAGE[section].name)}</Heading>
      {section === "account" && (
        <AccountSection language={language} me={me} onSignOut={onSignOut} />
      )}
      {section === "language" && (
        <div className="flex flex-col gap-4" data-language-pick>
          <p>{t("parent_language_intro")}</p>
          <RadioCards
            label={t("parent_page_language")}
            value={language}
            options={LANGUAGES.map((l) => ({ value: l, label: t(LANGUAGE_NAME[l]) }))}
            onChange={(value) => {
              const picked = LANGUAGES.find((l) => l === value);
              if (picked !== undefined) pickLanguage(picked);
            }}
          />
        </div>
      )}
      {section === "ai" && <AiSection language={language} me={me} onConsent={onConsent} />}
    </Page>
  );
}

function AccountSection({
  language,
  me,
  onSignOut,
}: {
  language: Language;
  me: Me;
  onSignOut: () => void;
}): ReactElement {
  const t = (key: CopyKey, params: Record<string, string> = {}): string =>
    copy(language, key, params, CATEGORY);
  return (
    <div className="flex flex-col gap-4">
      {me.account !== null && (
        <p data-account-since>
          {t("parent_account_since", { date: day(language, me.account.created_at) })}
        </p>
      )}
      <p>{t("parent_account_signed_in")}</p>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={onSignOut}
        data-settings-sign-out
      >
        <LogOutIcon aria-hidden />
        {t("parent_sign_out")}
      </Button>
    </div>
  );
}

const CONSENT_LINES = ["chat_consent_reads", "chat_consent_model", "chat_consent_kept"] as const;

function AiSection({
  language,
  me,
  onConsent,
}: {
  language: Language;
  me: Me;
  onConsent: ((consented: boolean) => Promise<void>) | null;
}): ReactElement {
  const t = (key: CopyKey, params: Record<string, string> = {}): string =>
    copy(language, key, params, CATEGORY);
  const given = me.pod?.ai_consent_at ?? null;
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");
  const change = (consented: boolean): void => {
    if (onConsent === null) return;
    setState("saving");
    onConsent(consented).then(
      () => setState("idle"),
      () => setState("failed"),
    );
  };
  return (
    <div className="flex flex-col gap-4">
      {CONSENT_LINES.map((key) => (
        <p key={key} data-consent-line={key}>
          {t(key)}
        </p>
      ))}
      <div className="flex flex-col gap-1 rounded-jw-card border-jw border-jw-line px-4 py-2">
        <Switch
          checked={given !== null}
          disabled={onConsent === null || me.pod === null || state === "saving"}
          onCheckedChange={change}
          data-ai-consent
        >
          {t("parent_ai_switch")}
        </Switch>
        <p className="text-jw-page-small text-jw-ink-soft" data-ai-consent-state>
          {given === null
            ? t("parent_ai_off")
            : t("parent_ai_given", { date: day(language, given) })}
        </p>
      </div>
      {state === "failed" && (
        <Notice role="alert" icon={<CircleAlert aria-hidden="true" />}>
          {t("chat_consent_failed")}
        </Notice>
      )}
    </div>
  );
}
