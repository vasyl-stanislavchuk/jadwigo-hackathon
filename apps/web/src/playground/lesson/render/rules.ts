// A stand-in for lane web's render rules (dl-a38n.28) so the conformance page builds before they
// land; deleted when main brings the real file. Same import path and signature.
import type { Finding } from "@jadwigo/lesson-import/file";
import type { FamilySpec } from "@jadwigo/lesson-kit";

export function renderFindings(_root: Element, _step: FamilySpec): Finding[] {
  return [];
}
