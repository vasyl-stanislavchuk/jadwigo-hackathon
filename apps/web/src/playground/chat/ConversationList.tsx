/**
 * A parent's conversations (dl-z5ja.106): the pod's live ones from `GET /api/v1/conversations`,
 * newest first, each to open, and Archive, the parent's delete (decision dl-84wo). Archive asks
 * once, with a line that says what it does: the conversation leaves the list, is kept with the
 * family's account and goes with it. The row leaves only once the route answers; a failure keeps
 * it and says so. No "delete for good" is built.
 */

import type { ConversationListClient } from "@jadwigo/api-client";
import type { Conversation, ConversationId } from "@jadwigo/contracts/run";
import { copy, type Language } from "@jadwigo/copy";
import { type ReactElement, useEffect, useState } from "react";

type Load = { kind: "loading" } | { kind: "failed" } | { kind: "ready"; rows: Conversation[] };

export function ConversationList({
  language,
  api,
  current,
  onOpen,
  onArchived,
}: {
  language: Language;
  api: ConversationListClient;
  /** The conversation the page shows, marked in the list. */
  current: ConversationId | null;
  onOpen(id: ConversationId): void;
  /** After the route archived one: the page leaves it if it was open. */
  onArchived?: ((id: ConversationId) => void) | undefined;
}): ReactElement {
  const say = (key: Parameters<typeof copy>[1]) => copy(language, key, {}, "adult");
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  /** The row whose Archive asks to confirm, and the row whose archive failed. */
  const [asking, setAsking] = useState<ConversationId | null>(null);
  const [failed, setFailed] = useState<ConversationId | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    api.listConversations().then(
      ({ conversations }) => live && setLoad({ kind: "ready", rows: conversations }),
      () => live && setLoad({ kind: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [api]);

  const archive = (id: ConversationId) => {
    setBusy(true);
    api.patchConversation(id, { archived: true }).then(
      () => {
        setLoad((l) =>
          l.kind === "ready" ? { ...l, rows: l.rows.filter((r) => r.id !== id) } : l,
        );
        setAsking(null);
        setFailed(null);
        setBusy(false);
        onArchived?.(id);
      },
      () => {
        setFailed(id);
        setAsking(null);
        setBusy(false);
      },
    );
  };

  return (
    <nav aria-label={say("chat_list_title")} data-conversations className="flex flex-col gap-2">
      <h2 className="text-base font-medium">{say("chat_list_title")}</h2>
      {load.kind === "loading" && <p className="text-muted-foreground text-sm">{say("loading")}</p>}
      {load.kind === "failed" && (
        <p role="alert" className="text-sm">
          {say("chat_list_failed")}
        </p>
      )}
      {load.kind === "ready" && load.rows.length === 0 && (
        <p data-conversations-empty className="text-muted-foreground text-sm">
          {say("chat_list_empty")}
        </p>
      )}
      {load.kind === "ready" && load.rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {load.rows.map((row) => (
            <li
              key={row.id}
              data-conversation={row.id}
              data-current={row.id === current || undefined}
              className="flex flex-col gap-1 rounded-md border p-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left"
                  onClick={() => onOpen(row.id)}
                >
                  {row.title ?? say("chat_list_untitled")}
                </button>
                <button
                  type="button"
                  data-archive={row.id}
                  className="rounded-md border px-2 py-0.5"
                  onClick={() => {
                    setAsking(row.id);
                    setFailed(null);
                  }}
                >
                  {say("chat_list_archive")}
                </button>
              </div>
              {asking === row.id && (
                <div data-archive-confirm className="flex flex-col gap-1">
                  <p>{say("chat_list_archive_confirm")}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-md border px-2 py-0.5"
                      onClick={() => archive(row.id)}
                    >
                      {say("chat_list_archive_yes")}
                    </button>
                    <button type="button" className="px-2 py-0.5" onClick={() => setAsking(null)}>
                      {say("chat_edit_cancel")}
                    </button>
                  </div>
                </div>
              )}
              {failed === row.id && (
                <p role="alert" data-archive-failed>
                  {say("chat_list_archive_failed")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
