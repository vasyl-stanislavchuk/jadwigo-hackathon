/**
 * One entry point for every family view (dl-w3.37.14): it picks the view by the step's family.
 * A teaching step asks nothing and is no family: teach/TeachView.tsx draws it.
 */

import type { ComponentType } from "react";
import { ChooseView } from "./choose/ChooseView.tsx";
import { EnterView } from "./enter/EnterView.tsx";
import { ExplainView } from "./explain/ExplainView.tsx";
import { GroupView } from "./group/GroupView.tsx";
import { Family, type FamilyName } from "./names.ts";
import { PlaceView } from "./place/PlaceView.tsx";
import { SequenceView } from "./sequence/SequenceView.tsx";
import { SlotsView } from "./slots/SlotsView.tsx";
import type { ViewProps } from "./view.ts";

const FAMILY_VIEWS: { [F in FamilyName]: ComponentType<ViewProps<F>> } = {
  [Family.Choose]: ChooseView,
  [Family.Enter]: EnterView,
  [Family.Slots]: SlotsView,
  [Family.Sequence]: SequenceView,
  [Family.Group]: GroupView,
  [Family.Place]: PlaceView,
  [Family.Explain]: ExplainView,
};

/** The view for the step's family. */
export function FamilyView<F extends FamilyName>(props: ViewProps<F>): JSX.Element {
  const View = FAMILY_VIEWS[(props.spec as { family: F }).family] as unknown as ComponentType<
    ViewProps<F>
  >;
  return <View {...props} />;
}
