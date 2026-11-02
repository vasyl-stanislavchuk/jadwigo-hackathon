// The words in the page's background clouds (dl-5ssh.4.40): what a child in grades 1-4 meets in each
// subject Jadwigo covers, beside the maths src/lib/sums.ts makes. Every page shows every subject, since
// they are the child's subjects, not the page's language. Hand-picked, so a native speaker reviews them
// with the page words. A new subject is one more list here and one more line in src/lib/clouds.ts.
import type { Language } from "@jadwigo/config";

// Polish spelling as it is taught in grades 1-3: each pair shows its rule through a related word.
export const polish: readonly string[] = [
  // ó that turns into o
  "róg – rogi",
  "stół – stoły",
  "lód – lody",
  "mróz – mrozy",
  "ogród – ogrody",
  "wóz – wozy",
  "pszczółka – pszczoła",
  // rz that turns into r, and rz after t, d, k, p
  "dobry – dobrze",
  "rower – na rowerze",
  "morze – morski",
  "góra – górzysty",
  "trzy",
  "drzewo",
  "krzesło",
  "przyjaciel",
  // ż that turns into g, and ż that stays
  "noga – nóżka",
  "droga – dróżka",
  "książka – księga",
  "żaba",
  "żółw",
  // ch and h
  "chleb",
  "chmura",
  "ucho",
  "herbata",
  "hulajnoga",
  // ą and ę
  "ząb – zęby",
  "dąb – dęby",
  "ręka – rączka",
  // nie: apart with a verb, together with an adjective
  "nie wiem",
  "nie lubię",
  "niewysoki",
  "nieduży",
  // a capital letter for a name
  "Wisła",
  "Kraków",
  "Bałtyk",
  // one and many
  "kot – koty",
  "pies – psy",
  "dziecko – dzieci",
  // syllables
  "ma-ma",
  "ko-tek",
  "sa-mo-lot",
  "po-mi-dor",
];

// English as a school subject in grades 1-4: first words, plurals, colours, numbers and short phrases.
export const english: readonly string[] = [
  "Hello!",
  "Thank you!",
  "How are you?",
  "What’s your name?",
  "I can swim.",
  "I like dogs.",
  "She is happy.",
  "a cat – two cats",
  "a book – books",
  "an apple",
  "big – bigger",
  "go – went",
  "one, two, three",
  "red, blue, green",
  "Monday",
  "spring, summer",
  "A, B, C",
];

// Maths facts a child learns by heart: units, time and money, and Roman numerals (grades 3-4).
export const mathsFacts: Record<Language, readonly string[]> = {
  pl: ["1 m = 100 cm", "1 kg = 1000 g", "1 h = 60 min", "1 doba = 24 h", "1 zł = 100 gr"],
  en: ["1 m = 100 cm", "1 kg = 1000 g", "1 h = 60 min", "1 day = 24 h"],
};
export const romanNumerals: readonly string[] = [
  "IV = 4",
  "IX = 9",
  "XII = 12",
  "XIV = 14",
  "XX = 20",
];
