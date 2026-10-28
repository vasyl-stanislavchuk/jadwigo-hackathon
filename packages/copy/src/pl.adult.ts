import type { PartialCopyTable } from "./types.ts";

// The adult Polish lines (dl-i952.17): the keys en.adult.ts rewords for an adult learning a
// command-line tool, written for a Polish-speaking adult, not translated word for word. Every
// other key falls back to pl.ts. Drafts until a parent reads them, as every pl line is.
export const plAdult: PartialCopyTable = {
  praise: [
    { text: "Zgadza się.", reviewed: false },
    { text: "Dokładnie tak.", reviewed: false },
    { text: "Dobrze, to działa.", reviewed: false },
  ],
  try_again: [
    { text: "Jeszcze nie całkiem. Spróbuj ponownie.", reviewed: false },
    { text: "Przyjrzyj się jeszcze raz i spróbuj ponownie.", reviewed: false },
  ],
  move_on: { text: "Na razie pomiń", reviewed: false },
  moved_on: { text: "W porządku, wrócimy do tego zadania.", reviewed: false },
  start: { text: "Rozpocznij lekcję", reviewed: false },
  mic_check: { text: "Sprawdzanie mikrofonu (wkrótce)", reviewed: false },
  tutor_resting: { text: "Dziś ćwiczysz bez głosu.", reviewed: false },
  load_failed: {
    text: "Lekcja się nie wczytała. Odśwież stronę, żeby spróbować ponownie.",
    reviewed: false,
  },
  finished: { text: "To koniec lekcji. Dziękuję!", reviewed: false },
  can_do_heading: { text: "Co już potrafisz", reviewed: false },
  session_finished: {
    text: "Ta lekcja jest zakończona. Możesz zacząć ją od nowa.",
    reviewed: false,
  },
};
