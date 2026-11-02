// The approved stills for the site's picture slots (dl-5ssh.4.24): one world, an evening kitchen table
// with the Queen and her pencil-case court
// (jadwigo-marketing/decisions/2026-11-02-the-site-s-pictures-are-one-world-wieczor-przy-stole-with-the-pen).
// A picture follows its slot, not the language; its alt text is in src/content/<lang>/landing.yaml.
// The sources live outside git (jadwigo-art/marketing, slots.csv); only the WebP files are here.
import { type FeaturedLesson, LessonId } from "@jadwigo/contracts";
import type { ImageMetadata } from "astro";
import cardPiatki from "../assets/illustrations/card-piatki.webp";
import cardRazyCztery from "../assets/illustrations/card-razy-cztery.webp";
import cardRowneGrupy from "../assets/illustrations/card-rowne-grupy.webp";
import hero from "../assets/illustrations/hero.webp";
import howStep2 from "../assets/illustrations/how-step2.webp";
import howTop from "../assets/illustrations/how-top.webp";
import partner from "../assets/illustrations/partner.webp";

export const slotArt = { hero, partner, howTop, howStep2 } satisfies Record<string, ImageMetadata>;

// A featured lesson's card picture, keyed by its lesson id because titles change. `alt` names its
// words under `lessons.row.pics`. A lesson with no picture keeps the grey slot.
export type CardArt = "rowneGrupy" | "piatki" | "razyCztery";
const cards = new Map<LessonId, { src: ImageMetadata; alt: CardArt }>([
  [LessonId.parse("les_2gj7s52rxqa5a9nkemj9dxbmpz"), { src: cardRowneGrupy, alt: "rowneGrupy" }],
  [LessonId.parse("les_4f0t7gmj5gawsspbwvekewh8as"), { src: cardPiatki, alt: "piatki" }],
  [LessonId.parse("les_2xqw41x6s0bw9bha5jb3yv7emm"), { src: cardRazyCztery, alt: "razyCztery" }],
]);

export function cardArt(lesson: FeaturedLesson): { src: ImageMetadata; alt: CardArt } | undefined {
  return cards.get(lesson.lesson_id);
}
