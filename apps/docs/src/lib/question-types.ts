import { hosts } from "@jadwigo/config";
import {
  familyInfo,
  QUESTION_TYPES,
  type QuestionTypeInfo,
} from "@jadwigo/lesson-kit/question-types";

/** The playground in the live app: every question type, and the System page with all of Zeszyt. */
const playground = `https://${hosts.prod.app}/playground`;
export const gallery = `${playground}/system`;

/**
 * A question type's page in the playground, `/playground/<family>/<question type>`: the pattern
 * apps/web's playground/route.ts reads. Copied, not imported, since the docs never import an app.
 */
export const playgroundUrl = (type: Pick<QuestionTypeInfo, "family" | "name">): string =>
  `${playground}/${encodeURIComponent(type.family)}/${encodeURIComponent(type.name)}`;

/** One family and its question types, in the catalog's order. */
export interface FamilyGroup {
  readonly name: string;
  readonly label: string;
  readonly does: string;
  readonly types: readonly QuestionTypeInfo[];
}

/** QUESTION_TYPES grouped by family, each family where its first question type sits. */
export function familyGroups(types: readonly QuestionTypeInfo[] = QUESTION_TYPES): FamilyGroup[] {
  const groups = new Map<QuestionTypeInfo["family"], QuestionTypeInfo[]>();
  for (const type of types) groups.set(type.family, [...(groups.get(type.family) ?? []), type]);
  return [...groups.entries()].map(([name, own]) => {
    const info = familyInfo(name);
    return { name, label: info.label, does: info.does, types: own };
  });
}
