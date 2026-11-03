// A child's tone (dl-uukj.47.67 D7, S19): an index to the disc's fill and initial classes. Until the
// learner stores its `tone` (dl-5ssh.145), the app passes the child's place in the pod's learners
// (wave 1, lead decision 4). Any integer works: the 11th child starts again at 0. The class names
// are written out whole so Tailwind finds them.
const TONES = [
  "bg-jw-tone-0-fill text-jw-tone-0-ink",
  "bg-jw-tone-1-fill text-jw-tone-1-ink",
  "bg-jw-tone-2-fill text-jw-tone-2-ink",
  "bg-jw-tone-3-fill text-jw-tone-3-ink",
  "bg-jw-tone-4-fill text-jw-tone-4-ink",
  "bg-jw-tone-5-fill text-jw-tone-5-ink",
  "bg-jw-tone-6-fill text-jw-tone-6-ink",
  "bg-jw-tone-7-fill text-jw-tone-7-ink",
  "bg-jw-tone-8-fill text-jw-tone-8-ink",
  "bg-jw-tone-9-fill text-jw-tone-9-ink",
] as const;

/** How many tones there are. */
export const TONE_COUNT = TONES.length;

/** The fill and initial classes of tone `index`, wrapped into 0-9 (a negative index too). */
export function toneClasses(index: number): string {
  const i = ((Math.trunc(index) % TONE_COUNT) + TONE_COUNT) % TONE_COUNT;
  return TONES[i] ?? TONES[0];
}
