// The audience a portal's content carries (dl-uukj.47.67, S1). A portal leaves the subtree that marks
// the audience, so the content marks itself again from the register: an app page's overlay is the
// adult's, and a lesson's (a gap's menu, a term, a lesson preview inside the parent app) stays the
// child's, so foundation.css gives it Zeszyt back.
import { useRegister } from "./register.tsx";

export function usePortalAudience(): "adult" | "kid" {
  return useRegister() === "lesson" ? "kid" : "adult";
}
