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
