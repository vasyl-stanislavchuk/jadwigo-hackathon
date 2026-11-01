/**
 * The pod's consent to the AI (dl-z5ja.32, re-scoped to dl-xo0q): given once, right after sign-up,
 * and asked again only when a conversation route answers 409 `AiConsentMissing`. Its words state
 * decision dl-uafq as it is: what the assistant reads, names included; that it reaches Meta's
 * models, which may train on it; that the run's record lives until the family's account is
 * deleted, an archived conversation included (dl-84wo). The chat itself shows no consent line.
 * The screen only asks; the caller gives the consent (`PodClient.patchPod`, dl-z5ja.112).
 */

import type { Client } from "@jadwigo/api-client";
import { copy, type Language } from "@jadwigo/copy";
import { Button, Heading, Notice } from "@jadwigo/ui";
import { type ReactElement, useState } from "react";

/** What the chat's fallback needs to give the consent: the pod from /me, then its PATCH. */
export type ConsentClient = Pick<Client, "getMe" | "patchPod">;

/** Gives the signed-in parent's pod its consent to the AI, read from /me. */
export async function giveConsent(api: ConsentClient): Promise<void> {
  const { pod } = await api.getMe();
  if (pod === null) throw new Error("no pod to consent for");
  await api.patchPod(pod.id, { ai_consented: true });
}

const LINES = ["chat_consent_reads", "chat_consent_model", "chat_consent_kept"] as const;

export function ConsentScreen({
  language,
  onAgree,
  onLater,
}: {
  language: Language;
  /** Gives the consent; the screen says so when it fails, and the parent can try again. */
  onAgree(): Promise<void>;
  /** "Not now": the screen steps aside, and the AI stays off. */
  onLater?: (() => void) | undefined;
}): ReactElement {
  const say = (key: Parameters<typeof copy>[1]) => copy(language, key, {}, "adult");
  const [state, setState] = useState<"asking" | "saving" | "failed">("asking");
  const agree = () => {
    setState("saving");
    onAgree().catch(() => setState("failed"));
  };
  return (
    <section data-consent aria-label={say("chat_consent_title")} className="flex flex-col gap-4">
      <Heading>{say("chat_consent_title")}</Heading>
      {LINES.map((key) => (
        <p key={key} data-consent-line={key}>
          {say(key)}
        </p>
      ))}
      {state === "failed" && <Notice role="alert">{say("chat_consent_failed")}</Notice>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="control"
          data-consent-agree
          disabled={state === "saving"}
          onClick={agree}
        >
          {say("chat_consent_agree")}
        </Button>
        {onLater && (
          <Button type="button" size="control" variant="outline" onClick={onLater}>
            {say("chat_consent_later")}
          </Button>
        )}
      </div>
    </section>
  );
}
