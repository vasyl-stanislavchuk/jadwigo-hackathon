/**
 * A child's tone index (dl-uukj.47.67 D7, S19): each child keeps one hue for life. Until the learner
 * stores its own `tone` (dl-5ssh.145), it is the child's place among the pod's learners by when each
 * was added, so it holds while no child is deleted (wave 1, lead decision 4). Pass the result to
 * @jadwigo/ui's Disc as `tone`. An unknown id gets 0.
 */
export function learnerTone(
  learners: readonly { readonly id: string; readonly created_at: string }[],
  id: string,
): number {
  // shortcut: derived from created_at order, upgrade to learner.tone when dl-5ssh.145 lands.
  const ordered = [...learners].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
  return Math.max(
    0,
    ordered.findIndex((l) => l.id === id),
  );
}
