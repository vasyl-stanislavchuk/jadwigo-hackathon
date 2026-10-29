// The public surface apps/web imports: the stage, its parts and the family views. Contract types
// (Gap, Stem, PlaceData and the rest) come from @jadwigo/contracts. Other files are private (AGENTS.md).

export { solutionOf } from "./families/answer.ts";
export type { Criterion, CriterionJudgement } from "./families/explain/model.ts";
export { FamilyView } from "./families/FamilyView.tsx";
export type { Figure, GroupIcon } from "./families/figure.ts";
export { GROUP_ICONS } from "./families/figure.ts";
export type { HelpRungNo, LastMiss } from "./families/help.ts";
export {
  gateOpen,
  HelpRung,
  helpLeft,
  helpNext,
  lastMissOf,
  NO_MISS,
  pageHelpOf,
  rungsWritten,
  solutionLines,
} from "./families/help.ts";
export type { FamilyName, QuestionTypeName } from "./families/names.ts";
export { FAMILIES, Family, QuestionType, Surface } from "./families/names.ts";
export type { QuestionTypeInfo } from "./families/questionTypes.ts";
export {
  familyInfo,
  QUESTION_TYPES,
  questionTypeInfo,
  questionTypesOf,
} from "./families/questionTypes.ts";
export { Stem } from "./families/Stem.tsx";
export { tileMode } from "./families/sequence/model.ts";
export { columnKey } from "./families/slots/column.ts";
export { TeachView } from "./families/teach/TeachView.tsx";
export type { FamilySpec, PageFamilySpec, Verdict } from "./families/types.ts";
export { pageSpec } from "./families/types.ts";
export { validate } from "./families/validate.ts";
export type { PlayProps } from "./families/view.ts";
export { ViewMode } from "./families/view.ts";
export type { ChoiceItem } from "./parts/ChoiceGroup.tsx";
export { ChoiceGroup, ChoiceStatic } from "./parts/ChoiceGroup.tsx";
export { DotArray } from "./parts/DotArray.tsx";
export { Entry } from "./parts/Entry.tsx";
export type { EntryState } from "./parts/entryState.ts";
export { EMPTY_ENTRY } from "./parts/entryState.ts";
export { Grip } from "./parts/Grip.tsx";
export type { GraphKind } from "./parts/graph.ts";
export { GRAPH_KINDS } from "./parts/graph.ts";
export { HelpLadder } from "./parts/HelpLadder.tsx";
export { LessonTheme } from "./parts/LessonTheme.tsx";
export { PictureView } from "./parts/PictureSheet.tsx";
export { QuestionCredit } from "./parts/QuestionCredit.tsx";
export { RichText } from "./parts/RichText.tsx";
export type { LessonProgress } from "./parts/StepShell.tsx";
export { LessonFrame, StepShell } from "./parts/StepShell.tsx";
export { STATUS } from "./parts/status.ts";
export { TileBank } from "./parts/TileBank.tsx";
export { Tooltip } from "./parts/Tooltip.tsx";
export type { Tone } from "./parts/tone.ts";
export type { Clock, Instant } from "./stage/clock.ts";
export { browserClock, stillClock } from "./stage/clock.ts";
export { press } from "./stage/press.ts";
export { StepFrame } from "./stage/StepFrame.tsx";
export type { Feedback, PartMark } from "./stage/types.ts";
