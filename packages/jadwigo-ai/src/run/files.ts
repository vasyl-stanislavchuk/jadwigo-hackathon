import { type AttachmentId, type Language, LIMITS, type PodId } from "@jadwigo/contracts";
import type { AttachmentMediaType, MessageAttachment, RunEvent } from "@jadwigo/contracts/run";
import { fence } from "../fence/index.ts";
import type { MusePart } from "../muse/client.ts";
import {
  type AttachmentReader,
  type ConvertedPage,
  type Converter,
  type ConvertRefusal,
  dataUrl,
  ownPage,
  ownPath,
} from "./attachments.ts";

/**
 * A parent's attached files as the turn's model input (dl-z5ja.11.4 photos, dl-z5ja.11.7 documents,
 * wave 6 decision 59). A JPEG goes as it is; a HEIC, a PDF or a DOCX goes as the converter's page
 * JPEGs, after one line with its kind and page count. Every image sits behind a photo block, at
 * most `LIMITS.imagesPerTurn` across the turn. The file's name never reaches the model: it is not on
 * `MessageAttachment`.
 */

/** A file the converter refused or could not render: the parent reads a line about it. */
export interface RefusedFile {
  attachment_id: AttachmentId;
  media_type: FileKind;
  refused: ConvertRefusal;
}

/** The turn's files: the parts of each parent message, by its `event_id`, and what was refused. */
export interface TurnFiles {
  parts: Map<string, MusePart[]>;
  refused: RefusedFile[];
}

/** What reading the turn's files needs: a reader, a converter, both absent in a probe or a test. */
export interface FileDeps {
  attachments?: AttachmentReader | undefined;
  converter?: Converter | undefined;
}

/** A kind the converter renders: anything but a JPEG. */
export type FileKind = Exclude<AttachmentMediaType, "image/jpeg">;
type Kind = FileKind;

const KIND: Record<Kind, string> = {
  "image/heic": "HEIC",
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
};

/** `n` pages, in Polish's 3 plural forms or English's 2. */
function pagesWord(n: number, language: Language): string {
  if (language === "en") return `${n} ${n === 1 ? "page" : "pages"}`;
  const tens = n % 100;
  const ones = n % 10;
  if (n === 1) return "1 strona";
  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) return `${n} strony`;
  return `${n} stron`;
}

/** The model's line before a file's pages: which file of the message, its kind and page count. */
function kindLine(i: number, n: number, kind: Kind, pages: number, language: Language): string {
  return language === "en"
    ? `File ${i} of ${n} the parent sent: ${KIND[kind]}, ${pagesWord(pages, language)}.`
    : `Plik ${i} z ${n} od rodzica: ${KIND[kind]}, ${pagesWord(pages, language)}.`;
}

/** The model's line for a file it does not get: the parent reads why in their own line. */
function refusedModelLine(i: number, n: number, kind: Kind, language: Language): string {
  return language === "en"
    ? `[File ${i} of ${n} the parent sent: ${KIND[kind]}. It could not be opened; the parent has been told.]`
    : `[Plik ${i} z ${n} od rodzica: ${KIND[kind]}. Nie udało się go otworzyć; rodzic o tym wie.]`;
}

/** The model's line for a page whose JPEG could not be read. */
function pageMissingLine(page: number, language: Language): string {
  return language === "en"
    ? `[Page ${page} could not be read.]`
    : `[Strony ${page} nie udało się odczytać.]`;
}

/** The model's line for the images the turn's cap left out of one message. */
function leftOutLine(n: number, language: Language): string {
  return language === "en"
    ? `[${n} more pages or photos were left out: a turn holds at most ${LIMITS.imagesPerTurn} images.]`
    : `[Pominięto jeszcze ${n} ze stron i zdjęć: w jednej turze mieści się najwięcej ${LIMITS.imagesPerTurn} obrazów.]`;
}

/** How the parent's line names a file: Polish needs the nominative and the genitive. */
const NAMED: Record<Kind, { pl: [string, string]; en: string }> = {
  "image/heic": { pl: ["Zdjęcie HEIC", "zdjęcia HEIC"], en: "the HEIC photo" },
  "application/pdf": { pl: ["Plik PDF", "pliku PDF"], en: "the PDF file" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    pl: ["Plik DOCX", "pliku DOCX"],
    en: "the DOCX file",
  },
};

/**
 * The line the parent reads in the chat for a refused file, in the record's language: short and
 * kind, with what to do next where there is something to do.
 */
export function refusedLine(file: RefusedFile, language: Language): string {
  const named = NAMED[file.media_type];
  const [nominative, genitive] = named.pl;
  const The = named.en.charAt(0).toUpperCase() + named.en.slice(1);
  if (file.refused === "too_many_pages") {
    return language === "en"
      ? `${The} has more than ${LIMITS.documentPages} pages. Send a shorter one, or photos of the pages you need.`
      : `${nominative} ma więcej niż ${LIMITS.documentPages} stron. Wyślij krótszy albo zdjęcia potrzebnych stron.`;
  }
  if (file.refused === "encrypted") {
    return language === "en"
      ? `${The} is protected by a password. Send it without the password.`
      : `${nominative} jest chroniony hasłem. Wyślij go bez hasła.`;
  }
  return language === "en"
    ? `I could not open ${named.en}.`
    : `Nie udało się otworzyć ${genitive}.`;
}

/**
 * The line an earlier turn's files become, never their bytes again, so a long chat costs no more.
 * Photos alone keep the wave 5 line.
 */
export function earlierLine(attached: readonly MessageAttachment[]): string {
  const counts = new Map<string, number>();
  for (const a of attached) {
    const key =
      a.media_type === "image/jpeg" || a.media_type === "image/heic" ? "photo" : a.media_type;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const named = [...counts].map(([key, n]) => {
    if (key === "photo") return `${n} ${n === 1 ? "photo" : "photos"}`;
    if (key === "application/pdf") return `${n} ${n === 1 ? "PDF" : "PDFs"}`;
    return `${n} ${n === 1 ? "DOCX file" : "DOCX files"}`;
  });
  return `[${named.join(", ")} from the parent, sent with this message in an earlier turn]`;
}

/**
 * The turn's own files as parts, by their message's `event_id`. A JPEG is a photo block and its
 * image; any other kind is a block with its kind and page count, then its pages in order. A path
 * outside the run's pod's `attachments/`, a host with no reader, or a missing object gives a line
 * instead, never bytes. A refused file, a page key the converter answered outside the file's own
 * folder, or a host with no converter is a line for the model and a `RefusedFile` for the parent.
 */
export async function turnFiles(
  deps: FileDeps,
  pod: PodId,
  log: readonly RunEvent[],
  language: Language,
): Promise<TurnFiles> {
  const files: TurnFiles = { parts: new Map(), refused: [] };
  let room: number = LIMITS.imagesPerTurn;
  for (const e of [...log].sort((a, b) => a.seq - b.seq)) {
    if (e.type !== "message" || e.payload.from !== "parent") continue;
    const attached = e.payload.attachments ?? [];
    if (attached.length === 0) continue;
    const parts: MusePart[] = [];
    let left = 0;
    for (const [i, file] of attached.entries()) {
      if (file.media_type === "image/jpeg") {
        const label = `Photo ${i + 1} of ${attached.length} the parent sent.`;
        if (room === 0) {
          left += 1;
          continue;
        }
        const bytes =
          deps.attachments && ownPath(pod, file.storage_path)
            ? await deps.attachments.read(file.storage_path)
            : undefined;
        if (bytes === undefined) {
          parts.push({ type: "input_text", text: `[${label} It could not be read.]` });
          continue;
        }
        parts.push({ type: "input_text", text: fence(label, "photo") });
        parts.push({ type: "input_image", image_url: dataUrl(file.media_type, bytes) });
        room -= 1;
        continue;
      }
      const kind = file.media_type;
      const converted = await convert(deps, pod, file);
      if ("refused" in converted) {
        files.refused.push({
          attachment_id: file.attachment_id,
          media_type: kind,
          refused: converted.refused,
        });
        parts.push({
          type: "input_text",
          text: refusedModelLine(i + 1, attached.length, kind, language),
        });
        continue;
      }
      parts.push({
        type: "input_text",
        text: fence(
          kindLine(i + 1, attached.length, kind, converted.pages.length, language),
          "photo",
        ),
      });
      for (const [p, page] of converted.pages.entries()) {
        if (room === 0) {
          left += 1;
          continue;
        }
        const bytes = deps.attachments ? await deps.attachments.read(page.storage_path) : undefined;
        if (bytes === undefined) {
          parts.push({ type: "input_text", text: pageMissingLine(p + 1, language) });
          continue;
        }
        parts.push({ type: "input_image", image_url: dataUrl("image/jpeg", bytes) });
        room -= 1;
      }
    }
    if (left > 0) parts.push({ type: "input_text", text: leftOutLine(left, language) });
    files.parts.set(e.event_id, parts);
  }
  return files;
}

/**
 * A file's pages through the converter, every key checked: the file must be the run's pod's, and
 * every page a JPEG in the file's own folder, else the whole file is refused and none is read.
 */
async function convert(
  deps: FileDeps,
  pod: PodId,
  file: MessageAttachment,
): Promise<{ pages: readonly ConvertedPage[] } | { refused: ConvertRefusal }> {
  if (!deps.converter) return { refused: "unavailable" };
  if (!ownPath(pod, file.storage_path)) return { refused: "unreadable" };
  const converted = await deps.converter.pages(file, pod);
  if ("refused" in converted) return converted;
  const { pages } = converted;
  if (pages.length === 0 || pages.some((p) => !ownPage(pod, file.storage_path, p.storage_path))) {
    return { refused: "unreadable" };
  }
  return { pages };
}
