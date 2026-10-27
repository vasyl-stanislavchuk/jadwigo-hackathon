/**
 * Interaction families: a question type is one family with a few options, and a family is defined
 * by the shape of the learner's answer. The family's data, key, value, help and verdict are typed
 * in `@jadwigo/contracts`; this file keeps only what the contracts don't carry: the question as the
 * playground holds it (`FamilySpec`), and the same question as the page receives it.
 *
 * The rules every family follows: the body (`data`) and the key are kept apart, the key has the
 * answer's shape, every option, item, gap, group and region has an id (never a position), and a
 * verdict is given per part. The parts are evidence, never a score.
 */

import type {
  ChooseData,
  ChooseKey,
  ChooseValue,
  EnterData,
  EnterKey,
  EnterValue,
  ExplainData,
  ExplainKey,
  ExplainValue,
  GroupData,
  GroupKey,
  GroupValue,
  PlaceData,
  PlaceKey,
  PlaceValue,
  QuestionType,
  SequenceData,
  SequenceKey,
  SequenceValue,
  SlotsData,
  SlotsKey,
  SlotsValue,
} from "@jadwigo/contracts";
import type { StepHelp } from "./help.ts";
import type { Family, FamilyName } from "./names.ts";

export type { PartMark, PartVerdict, Verdict } from "@jadwigo/contracts";
export type { FamilyName, QuestionTypeName, SurfaceName } from "./names.ts";
export { FAMILIES, Family, QuestionType, Surface } from "./names.ts";

/** Whether a miss marks the missed parts or only the whole step (the marks rule). A typed word's
 * letters are marked under either: they are inside the one field. */
export type Marks = "parts" | "whole";

interface Envelope {
  id: string;
  /** Spoken verbatim by TTS. Never holds anything key-derivable. */
  say: string;
  /** The question type this question was written from (families/questionTypes.ts). */
  question_type: QuestionType;
  /** The help ladder (help.ts). Held with the key: the page gets one rung at a time. */
  help?: StepHelp | undefined;
}

export type FamilyStep =
  | { family: typeof Family.Choose; data: ChooseData; key: ChooseKey }
  | { family: typeof Family.Enter; data: EnterData; key: EnterKey }
  | { family: typeof Family.Slots; data: SlotsData; key: SlotsKey }
  | { family: typeof Family.Sequence; data: SequenceData; key: SequenceKey }
  | { family: typeof Family.Group; data: GroupData; key: GroupKey }
  | { family: typeof Family.Place; data: PlaceData; key: PlaceKey }
  | { family: typeof Family.Explain; data: ExplainData; key: ExplainKey };

/** A playground question built from contracts pieces: the envelope, the family's data and its key. */
export type FamilySpec = Envelope & FamilyStep;

export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** A question without its help ladder, as a twin is. */
export type BareSpec = DistributiveOmit<FamilySpec, "help">;

/** The same question as the page receives it: everything but the key and the help ladder. */
export type PageFamilySpec = Omit<Envelope, "help"> & DistributiveOmit<FamilyStep, "key">;

/** The value each family commits, by family. */
export interface FamilyValue {
  choose: ChooseValue;
  enter: EnterValue;
  slots: SlotsValue;
  sequence: SequenceValue;
  group: GroupValue;
  place: PlaceValue;
  explain: ExplainValue;
}

export type SpecOf<F extends FamilyName> = Extract<FamilySpec, { family: F }>;

/** The page-side spec: strips the key and the help ladder, which the server releases a rung at a
 * time. */
export function pageSpec(spec: BareSpec | FamilySpec): PageFamilySpec {
  const { key: _key, ...rest } = spec;
  const { help: _help, ...page } = rest as typeof rest & { help?: StepHelp };
  return page as PageFamilySpec;
}
