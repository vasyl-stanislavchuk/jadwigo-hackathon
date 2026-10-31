import type { FsrsCard } from "@jadwigo/contracts";
import {
  type Card,
  createEmptyCard,
  fsrs,
  type Grade,
  generatorParameters,
  Rating,
  State,
} from "ts-fsrs";

/** One FSRS review: the attempt's last answer on the skill, rated by its worst event. */
export interface Review {
  readonly at: string;
  readonly rating: Grade;
}

export const AGAIN: Grade = Rating.Again;
export const HARD: Grade = Rating.Hard;
export const GOOD: Grade = Rating.Good;

/** No fuzz, so the same reviews always give the same card; FSRS's default 0.9 retention. */
const SCHEDULER = fsrs(generatorParameters({ enable_fuzz: false, request_retention: 0.9 }));

/**
 * The card after replaying `reviews` in order from an empty card, under py-fsrs's names so the
 * Python side reads the same JSON: no `New` state (a reviewed card is learning at least), and
 * `step` only while learning or relearning. Null when there was no review.
 */
export function replay(reviews: readonly Review[]): FsrsCard | null {
  const first = reviews[0];
  if (first === undefined) return null;
  let card: Card = createEmptyCard(new Date(first.at));
  for (const review of reviews)
    card = SCHEDULER.next(card, new Date(review.at), review.rating).card;
  const state = card.state === State.New ? State.Learning : card.state;
  return {
    state,
    step: state === State.Review ? null : card.learning_steps,
    stability: card.stability,
    difficulty: card.difficulty,
    due: card.due.toISOString(),
    last_review: card.last_review === undefined ? null : card.last_review.toISOString(),
  };
}
