import { AttachmentId, ID_PREFIXES, idOf } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { earlierLine, type FileKind, refusedLine } from "./files.ts";

const ID = AttachmentId.parse(idOf(ID_PREFIXES.attachment, crypto.randomUUID()));
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const;

describe("the lines a refused file becomes (dl-z5ja.11.7)", () => {
  const line = (media_type: FileKind, refused: Parameters<typeof refusedLine>[0]["refused"]) => ({
    pl: refusedLine({ attachment_id: ID, media_type, refused }, "pl"),
    en: refusedLine({ attachment_id: ID, media_type, refused }, "en"),
  });

  it("says what happened in the record's language, and what to do where there is something", () => {
    expect(line("application/pdf", "unreadable")).toEqual({
      pl: "Nie udało się otworzyć pliku PDF.",
      en: "I could not open the PDF file.",
    });
    expect(line(DOCX, "too_many_pages")).toEqual({
      pl: "Plik DOCX ma więcej niż 10 stron. Wyślij krótszy albo zdjęcia potrzebnych stron.",
      en: "The DOCX file has more than 10 pages. Send a shorter one, or photos of the pages you need.",
    });
    expect(line("image/heic", "unavailable").pl).toBe("Nie udało się otworzyć zdjęcia HEIC.");
  });
});

describe("the line an earlier turn's files become", () => {
  const of = (media_type: FileKind | "image/jpeg") => ({
    attachment_id: ID,
    storage_path: "x",
    media_type,
    bytes: 1,
    width: null,
    height: null,
  });

  it("keeps wave 5's photo line, and names documents by kind", () => {
    expect(earlierLine([of("image/jpeg")])).toBe(
      "[1 photo from the parent, sent with this message in an earlier turn]",
    );
    expect(
      earlierLine([of("image/jpeg"), of("image/heic"), of("application/pdf"), of(DOCX), of(DOCX)]),
    ).toBe(
      "[2 photos, 1 PDF, 2 DOCX files from the parent, sent with this message in an earlier turn]",
    );
  });
});
