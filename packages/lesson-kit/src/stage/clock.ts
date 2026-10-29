/**
 * The client clock (docs/reference/blocks.md "The clock"). Every instant is a
 * performance.now() reading paired with a wall-clock read in the same callback: latency
 * is computed inside performance.now() only; the wall times are for ordering.
 */

export interface Instant {
  perf: number;
  wall: string;
}

export interface Clock {
  now(): Instant;
}

export const browserClock: Clock = {
  now: () => ({ perf: performance.now(), wall: new Date().toISOString() }),
};

/**
 * A pinned clock for a still view (a review, the playground's Gallery and states): a still view has
 * no timing to measure, so every instant is the same and the view draws the same every time.
 */
export const stillClock: Clock = {
  now: () => ({ perf: 0, wall: "2026-10-18T00:00:00.000Z" }),
};
