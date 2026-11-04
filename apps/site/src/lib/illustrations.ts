// The approved stills for the site's picture slots (dl-5ssh.4.24): one world, an evening kitchen table
// with the Queen and her pencil-case court
// (jadwigo-marketing/decisions/2026-11-02-the-site-s-pictures-are-one-world-wieczor-przy-stole-with-the-pen).
// A picture follows its slot, not the language; its alt text is in src/content/<lang>/landing.yaml.
// The sources live outside git (jadwigo-art/marketing, slots.csv); only the WebP files are here.
import { type FeaturedLesson, LessonId } from "@jadwigo/contracts";
import type { ImageMetadata } from "astro";
import cardG1a from "../assets/illustrations/card-g1a.webp";
import cardG1b from "../assets/illustrations/card-g1b.webp";
import cardG2a from "../assets/illustrations/card-g2a.webp";
import cardG2b from "../assets/illustrations/card-g2b.webp";
import cardG3a from "../assets/illustrations/card-g3a.webp";
import cardG3b from "../assets/illustrations/card-g3b.webp";
import cardPl3CzesciMowy from "../assets/illustrations/card-pl3-czesci-mowy.webp";
import cardPl3Czytanie from "../assets/illustrations/card-pl3-czytanie.webp";
import cardPl3Gloski from "../assets/illustrations/card-pl3-gloski.webp";
import cardPl3Ortografia from "../assets/illustrations/card-pl3-ortografia.webp";
import cardPl3Zdanie from "../assets/illustrations/card-pl3-zdanie.webp";
import courtGumka from "../assets/illustrations/court-gumka.webp";
import courtLinijka from "../assets/illustrations/court-linijka.webp";
import courtOlowek from "../assets/illustrations/court-olowek.webp";
import courtQueen from "../assets/illustrations/court-queen.webp";
import eyesClosed from "../assets/illustrations/eyes-closed.webp";
import hero from "../assets/illustrations/hero.webp";
import howStep2 from "../assets/illustrations/how-step2.webp";
import howTop from "../assets/illustrations/how-top.webp";
import partner from "../assets/illustrations/partner.webp";

// `partner` is the table picture with the blinking Queen, in the landing page's hero since
// dl-5ssh.4.48. The sprout that was the partner block's picture left with dl-w0b4.146.
export const slotArt = { hero, partner, howTop, howStep2 } satisfies Record<string, ImageMetadata>;

// The court on their own, transparent, from jadwigo-art/cast/2a/anchors (dl-w0b4.127): the 4 who carry
// /jadwigo-ai's steps, in that order.
export const courtArt = [courtQueen, courtOlowek, courtGumka, courtLinijka] as const;

// The Queen's slow blink on the table picture (dl-5ssh.4.25, approved 2026-11-02; drawn by
// src/components/BlinkingQueen.astro): her closed eyes, a feathered 2 KB patch cut from partner.webp exactly as it is. If partner.webp is ever re-cropped,
// re-exported or replaced, cut the patch again (jadwigo-art/marketing/motion/blink/HANDOFF.md section 6).
export const blinkEyes = eyesClosed;

// A featured lesson's card picture, keyed by its lesson id because titles change (dl-5ssh.4.42): one
// picture per pl/en pair, so the Polish lesson and its English twin show the same scene, and one per
// Polish-only lesson, which has no twin (dl-w0b4.137). `alt` names its words under
// `lessons.row.pics`. A lesson with no picture keeps the grey slot.
export type CardArt =
  | "cukier"
  | "nalesnik"
  | "skoki"
  | "mierzenie"
  | "czekolada"
  | "spacer"
  | "pl3_czytanie"
  | "pl3_gloski"
  | "pl3_czesci_mowy"
  | "pl3_zdanie"
  | "pl3_ortografia";
const pairs: readonly [string, string, ImageMetadata, CardArt][] = [
  // grade 1: Dodajemy i odejmujemy do 20 / Adding and taking away to 20
  ["les_40jwhmppkbb5vvag7rc27xrn1x", "les_0pdpkegvywbn1vvqzeyhcwvxsm", cardG1a, "cukier"],
  // grade 1: Kształty, połówki i zegar / Shapes, halves and clocks
  ["les_7z05n79z6ra1z9xdj4keaktb1m", "les_0ek5xpnz10aqq8haa50rgnr7sx", cardG1b, "nalesnik"],
  // grade 2: Dodajemy i odejmujemy na rysunkach / Adding and taking away with pictures
  ["les_3z0kf94a2abxbv5yhe202sr6vm", "les_740yr65y84afvs62v9q1v2g7nb", cardG2a, "skoki"],
  // grade 2: Zegar i centymetry / Clocks and centimeters
  ["les_6431cz07ssbd0vhkx4jfg8tfa4", "les_06hhmv04syatxr3kkf8bfwdzmr", cardG2b, "mierzenie"],
  // grade 3: Mnożenie na obrazkach / Multiplying with pictures
  ["les_1p7s8gcz8pamjav6amd84fd7ak", "les_6rcs4dkmtebxgrsgy7cfcdbjdb", cardG3a, "czekolada"],
  // grade 3: Zegar i wykresy / Clocks and graphs
  ["les_4ymyms965aakxtbz0k3t8kr2py", "les_1a5was8kx4byw9rtw2x6yqh6eh", cardG3b, "spacer"],
];
// The grade-3 Polish lessons (dl-n9fr.80): Polish only, so one lesson id each.
const singles: readonly [string, ImageMetadata, CardArt][] = [
  // Czytam ze zrozumieniem: Spacer w deszczu
  ["les_023x6dyc9dbb79g206p9pd6j7c", cardPl3Czytanie, "pl3_czytanie"],
  // Litery, głoski, sylaby i alfabet
  ["les_7h3fzt6v0yb6sr0r6ks039kptj", cardPl3Gloski, "pl3_gloski"],
  // Rzeczownik, przymiotnik, czasownik i rodzina wyrazów
  ["les_35dzxscf7hbagsbt3kfdfmm40z", cardPl3CzesciMowy, "pl3_czesci_mowy"],
  // Zdania: rozsypanka, rozwijanie i pytania
  ["les_6hqetrmeg0bqktxa1vqh53c5d0", cardPl3Zdanie, "pl3_zdanie"],
  // Ortografia, zaproszenie, życzenia i adres
  ["les_4tgxbakxsha3rb1httn8rsm4p8", cardPl3Ortografia, "pl3_ortografia"],
];
const cards = new Map<LessonId, { src: ImageMetadata; alt: CardArt }>([
  ...pairs.flatMap(([pl, en, src, alt]): [LessonId, { src: ImageMetadata; alt: CardArt }][] => [
    [LessonId.parse(pl), { src, alt }],
    [LessonId.parse(en), { src, alt }],
  ]),
  ...singles.map(([id, src, alt]): [LessonId, { src: ImageMetadata; alt: CardArt }] => [
    LessonId.parse(id),
    { src, alt },
  ]),
]);

export function cardArt(lesson: FeaturedLesson): { src: ImageMetadata; alt: CardArt } | undefined {
  return cards.get(lesson.lesson_id);
}
