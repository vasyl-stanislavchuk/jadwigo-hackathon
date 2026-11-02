/**
 * The parent app's first screen, "Lekcje / Nowa lekcja" (decision 2026-11-01-the-parent-app-is-a-
 * sidebar-shell-and-a-3-column-lesson-workspac, dl-xo0q; handoff §5.1, docs/worklog/dl-uukj.47):
 * the question and one box, and under it one muted line about Jadwigo AI that opens a small dialog
 * (AboutJadwigoAi.tsx, dl-uukj.47.37); nothing else (no subtitle, no starters, no consent line). The caret is
 * in the box on load; the placeholder is the only example.
 *
 * On the adult kit (handoff dl-uukj.47.67 §12.2): the question at the question size and 600, the
 * kit's Textarea growing to 6 lines inside one bordered box, Dla as the kit's Combobox (DlaSelect.tsx),
 * and "Zrób lekcję" the view's one primary.
 *
 *   empty   "Zrób lekcję" is aria-disabled and says why on hover, focus and touch (DisabledReason, S5)
 *   ready   text or a photo: the button acts and the reason goes; Enter sends, Shift+Enter makes a
 *           new line
 *
 * Under the text: "Dodaj zdjęcie", then Dla, then the button.
 * Photos (picked, pasted with Ctrl+V or dropped) upload as soon as they are added, each through a
 * PhotoUpload, and show as the chat's 64 × 80 chips with progress, reason, Retry and × (dl-z5ja.11.16).
 * "Zrób lekcję" waits until every photo has uploaded: while one uploads the reason says so, and one
 * that failed holds the send with its reason until it is retried or removed. The send carries the
 * uploaded photos' attachment ids in the order they were added.
 *
 * The unsent words and Dla are kept in the tab as they change (draft.ts, dl-uukj.47.24): leaving for
 * a child's page or reloading brings them back, and a send clears them.
 */

import type { AttachmentId, Learner, LearnerId } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, DisabledReason, Textarea } from "@jadwigo/ui";
import { ArrowRightIcon, ImagePlusIcon } from "lucide-react";
import {
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { AttachmentChips } from "../../chat/attachments/AttachmentChips.tsx";
import { admit, PhotoUpload, type UploadDeps } from "../../chat/attachments/upload.ts";
import { CATEGORY } from "../adult.ts";
import { AboutJadwigoAi } from "./AboutJadwigoAi.tsx";
import { DlaSelect } from "./DlaSelect.tsx";
import { newLessonDraft } from "./draft.ts";

/** What the parent sends: the words, the uploaded photos, and the child the lesson is for (or none). */
export interface LessonAsk {
  text: string;
  attachmentIds: AttachmentId[];
  learner: LearnerId | null;
}

const images = (files: Iterable<File>): File[] =>
  [...files].filter((file) => file.type.startsWith("image/"));

export function NewLessonBox({
  language,
  learners,
  forLearner,
  onForChange,
  onAddChild,
  onSend,
  photos = false,
  uploadDeps,
  busy = false,
  problem = null,
  initialText = "",
  owner = null,
}: {
  language: Language;
  learners: readonly Learner[];
  /** Dla: the child the lesson is for, or null. */
  forLearner: LearnerId | null;
  onForChange: (learner: LearnerId | null) => void;
  /** Opens Dodaj dziecko from Dla's menu. */
  onAddChild: () => void;
  onSend: (ask: LessonAsk) => void;
  /** Whether photos can be added; they need `uploadDeps` too (dl-z5ja.11.16). */
  photos?: boolean;
  /** What a photo's upload runs on: the api's `createAttachment` and the browser's canvas and XHR. */
  uploadDeps?: UploadDeps;
  /** The send is on its way: the button says so and takes no second press (dl-z5ja.108). */
  busy?: boolean;
  /** Why the last send did not start, in words, under the box; null for none. */
  problem?: string | null;
  /** The words the box opens with: the parent's own, back after the consent screen. */
  initialText?: string;
  /** The signed-in account, whose draft alone the box reads back (draft.ts). */
  owner?: string | null;
}): ReactElement {
  const t = (key: CopyKey): string => copy(language, key, {}, CATEGORY);
  const [text, setText] = useState(() => initialText || (newLessonDraft.get(owner)?.text ?? ""));
  const deps = photos ? (uploadDeps ?? null) : null;
  const photosOn = deps !== null;
  const [uploads, setUploads] = useState<PhotoUpload[]>([]);
  const [leftOff, setLeftOff] = useState(0);
  const box = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  // Each upload's state change draws the box again, so the reason and the button follow it.
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const offs = uploads.map((upload) => upload.subscribe(redraw));
    return () => {
      for (const off of offs) off();
    };
  }, [uploads]);
  // Every upload stops when the screen goes; an id already taken is in the send that left.
  const held = useRef<PhotoUpload[]>([]);
  held.current = uploads;
  useEffect(
    () => () => {
      for (const upload of held.current) upload.dispose();
    },
    [],
  );

  const views = uploads.map((upload) => upload.get());
  const ready = text.trim() !== "" || uploads.length > 0;
  const uploading = views.some((view) => view.state === "uploading");
  const failed = views.some((view) => view.state === "failed");
  const refused = views.some((view) => view.state === "refused");
  const stuck = failed || refused;
  const go = ready && !uploading && !stuck;
  const reason: CopyKey | null = !ready
    ? "parent_send_reason"
    : refused
      ? "parent_send_photo_refused"
      : failed
        ? "parent_send_photo_failed"
        : uploading
          ? "parent_send_uploading"
          : null;

  // The caret is in the box on load.
  useEffect(() => box.current?.focus(), []);

  // Dla as the tab left it, unless the page came with a child of its own (?for). Read once, before
  // the keeping below writes this render's value.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on the screen's first render
  useEffect(() => {
    const kept = newLessonDraft.get(owner)?.learner ?? null;
    if (forLearner === null && kept !== null && learners.some((l) => l.id === kept))
      onForChange(kept);
  }, []);
  // The words and Dla, kept in the tab as they change.
  useEffect(
    () => newLessonDraft.put({ owner, text, learner: forLearner }),
    [owner, text, forLearner],
  );

  const add = (files: File[]): void => {
    if (deps === null || files.length === 0) return;
    const { admitted, leftOff: left } = admit(held.current.length, files);
    setLeftOff(left);
    if (admitted.length === 0) return;
    const added = admitted.map((file) => new PhotoUpload(file, deps));
    held.current = [...held.current, ...added];
    setUploads(held.current);
    for (const upload of added) void upload.start();
  };
  // The chip has already stopped the upload and revoked its preview.
  const remove = (upload: PhotoUpload): void => {
    held.current = held.current.filter((u) => u !== upload);
    setUploads(held.current);
    setLeftOff(0);
  };

  const send = (): void => {
    if (!go || busy) return;
    const attachmentIds = views.flatMap((view) =>
      view.attachmentId === null ? [] : [view.attachmentId],
    );
    newLessonDraft.clear();
    onSend({ text: text.trim(), attachmentIds, learner: forLearner });
  };
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    send();
  };
  const keys = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  };
  const paste = (event: ClipboardEvent<HTMLTextAreaElement>): void => {
    const pasted = images(event.clipboardData.files);
    if (!photosOn || pasted.length === 0) return;
    event.preventDefault();
    add(pasted);
  };
  const drop = (event: DragEvent<HTMLFormElement>): void => {
    if (!photosOn) return;
    event.preventDefault();
    add(images(event.dataTransfer.files));
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-4 pt-10 pb-40 lg:px-6">
      {/* shortcut: the kit has no --jw-adult-question (28/600) yet, so the question keeps the page's
          question size (32) at 600; switch to it once packages/ui adds the token. */}
      <h1 className="text-center text-jw-page-question leading-tight font-semibold tracking-tight">
        {t("parent_question")}
      </h1>
      <form
        onSubmit={submit}
        onDragOver={(event) => photosOn && event.preventDefault()}
        onDrop={drop}
        data-new-lesson
        data-ready={ready ? "" : undefined}
        className="flex w-full max-w-4xl flex-col gap-3 rounded-jw-box border border-input bg-background p-3 transition-[border-color,box-shadow] duration-jw-fast has-[textarea:focus]:border-jw-focus has-[textarea:focus]:ring-2 has-[textarea:focus]:ring-selected"
      >
        <Textarea
          ref={box}
          rows={3}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={keys}
          onPaste={paste}
          aria-label={t("parent_box_label")}
          placeholder={t("parent_placeholder")}
          className="border-0 bg-transparent px-1 focus-visible:ring-0"
          data-ask
        />
        <AttachmentChips
          language={language}
          uploads={uploads}
          leftOff={leftOff}
          onRemove={remove}
        />
        <div className="flex flex-wrap items-center gap-2">
          {photosOn && (
            <>
              <input
                ref={picker}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                  add(images(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="control"
                onClick={() => picker.current?.click()}
                data-attach
              >
                <ImagePlusIcon aria-hidden className="text-muted-foreground" />
                {t("parent_attach")}
              </Button>
            </>
          )}
          <DlaSelect
            language={language}
            learners={learners}
            value={forLearner}
            onChange={onForChange}
            onAddChild={onAddChild}
          />
          {/* The send keeps to the right, on the row or on its own line on a phone. */}
          <span className="ml-auto">
            {reason === null ? (
              <Button type="submit" size="control" aria-disabled={busy} aria-busy={busy} data-send>
                {busy ? t("parent_sending") : t("parent_send")}
                <ArrowRightIcon aria-hidden />
              </Button>
            ) : (
              <DisabledReason reason={t(reason)}>
                <Button type="submit" size="control" data-send>
                  {t("parent_send")}
                  <ArrowRightIcon aria-hidden />
                </Button>
              </DisabledReason>
            )}
          </span>
        </div>
      </form>
      <AboutJadwigoAi language={language} />
      {problem !== null && (
        <p role="alert" className="text-jw-ink" data-send-problem>
          {problem}
        </p>
      )}
    </div>
  );
}
