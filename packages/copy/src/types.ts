/**
 * The copy table shape (docs/reference/blocks.md "Copy"). Every word the page shows or
 * announces that is not in the snapshot lives in pl.ts and en.ts (the child tables) and
 * a category's own tables beside them (en.adult.ts, dl-i952.17), nowhere else.
 */

/** The languages Jadwigo speaks (jadwigo-platform/decisions/2026-10-26-jadwigo-carries-no-ukrainian-the-tables-stay-in-david-learns-and). */
export type Language = "pl" | "en";

/** Who reads the line, as packages/contracts names it. */
export type Category = "child" | "adult";

/** Intl.PluralRules categories; `other` is the one every language has. */
type PluralForms = Partial<Record<"zero" | "one" | "two" | "few" | "many", string>> & {
  other: string;
};

/**
 * One line. `reviewed` stays false until a parent has read it (pl always ships
 * false). A `{slot}` named in `plural` is filled with the form chosen by the number in
 * `vars[count]` — each counted noun has its own rule, so "7 rzędów po 8 kropek" and
 * "2 rzędy po 3 kropki" both come out right.
 */
export interface CopyEntry {
  text: string;
  reviewed: boolean;
  plural?: Record<string, { count: string; forms: PluralForms }>;
}

export const COPY_KEYS = [
  // blocks
  "continue",
  "check",
  "erase",
  "done",
  "show_more",
  "answer_field",
  "choose_answer",
  "build_rectangle",
  "choose_rectangle",
  "dims",
  "array_label",
  "groups_label",
  "number_line_label",
  "table_row",
  "swapped_order",
  // ---- Tier-1: fill_blank, number_line (dl-w3.12, dl-w3.15) ----
  "blank",
  "number_line_axis",
  "number_line_marker",
  // dl-w3.70.19: Khan's tick control, a stepper that cuts the line into equal parts
  "divisions_label",
  "divisions_fewer",
  "divisions_more",
  "step_left",
  "step_right",
  // ---- end Tier-1: fill_blank, number_line ----
  "praise",
  // dl-w3.68.1: after a right typed answer, the other accepted form, under the praise line
  "other_form",
  // dl-uukj.29.108: after a right equation written the other way round, the question's form (Enter addendum 3.7)
  "sides_swapped_form",
  "try_again",
  "move_on",
  "moved_on",
  // dl-uukj.23: the playground's experiments on a stuck step and a held verdict (until the owner picks)
  "moved_on_calm",
  "noted",
  "dont_know_yet",
  // screens and runner
  "start",
  "mic_check",
  "no_voice_today",
  "tutor_resting",
  "loading",
  "saving",
  "connection_trouble",
  "load_failed",
  "finished",
  "can_do_heading",
  // voice indicator (src/voice/indicator.ts copyKey) and tap-to-hear (dl-w2.4)
  "voice_resting",
  "voice_waking",
  "voice_listening",
  "voice_speaking",
  "tap_to_hear",
  // a prepared clip of the word (PlayClip, dl-w3.68.11): drafts for a parent to read
  "play_clip",
  "play_clip_slow",
  // a session the server closed before the end (events API 400 SessionFinalized)
  "session_finished",
  "start_again",
  // true_false and reveal (dl-w3.11, dl-w3.13): drafts for a parent to read
  "true_or_false",
  "yes",
  "no",
  // dl-w3.70.4: Khan's none-of-the-above, the last option of a choice, in the child's words
  "none_of_these",
  "reveal_steps",
  "reveal_show",
  "reveal_drag",
  "reveal_predict",
  "reveal_have_idea",
  "reveal_not_sure",
  // lettered_choice (dl-xdyq.4): drafts for a parent to read
  "contest_task_image",
  "tried_option",
  "hint",
  "worked_solution",
  // ---- the help ladder (families/help.ts) ----
  "help_almost",
  "help_look",
  "help_me",
  "help_more",
  "help_smaller",
  "help_try_first",
  "help_twin",
  "solution_step",
  "solution_next",
  "solution_tap",
  // inline code and the terminal card (dl-i952.19): drafts to read. Never read aloud.
  "code_terminal",
  "code_command",
  "code_output",
  "code_copy",
  "code_copied",
  "code_copy_failed",
  "code_placeholder",
  // the printed sheet (dl-dcih): drafts for a parent to read. No points, no clock, no score.
  "print_task",
  "answer_card",
  "answer_card_note",
  "answer_card_example_right",
  "answer_card_example_wrong",
  "answer_card_fix",
  // drag and tap-tap for Sequence and Group (dl-w3.37.11): drafts for a parent to read
  "drag_beside",
  "drag_hint",
  "drag_picked",
  "drag_moved_to",
  "drag_in_group",
  "drag_tray",
  "tile_cleared",
  "tile_hint",
  "tile_slot_empty",
  // the family views (dl-w3.37.12): drafts for a parent to read
  "answer_yours",
  "answer_right",
  "choose_all",
  "gap_label",
  "hotspot_marker",
  "explain_field",
  "explain_hint",
  "explain_more",
  "explain_pieces",
  // draw a graph (dl-w3.51.3): drafts for a parent to read
  "bar_height",
  "bar_label",
  "graph_label",
  "incomplete_graph",
  "picture_stands_for",
  // a question in several parts (dl-w3.51.6): drafts for a parent to read
  "incomplete_parts",
  "part_label",
  // the step contract (dl-w3.41, docs/17 §2f): drafts for a parent to read
  "incomplete_gaps",
  "incomplete_group",
  "incomplete_place",
  "incomplete_sequence",
  "incomplete_text",
  // Enter: an expression on the keypad (dl-w3.51.1)
  "bracket_close",
  "bracket_open",
  "incomplete_expression",
  // Enter: an equation on the keypad (dl-w3.70.17)
  "sign_equals",
  // Enter: a ruler over a picture (dl-w3.51.4)
  "ruler_at",
  "ruler_label",
  "sign_divide",
  "sign_minus",
  "sign_plus",
  "sign_times",
  // Enter: a decimal on the keypad (dl-w3.70.7)
  "decimal_comma",
  "incomplete_decimal",
  // Enter: a fraction in stacked boxes (dl-w3.70.16)
  "incomplete_fraction_boxes",
  "fraction_simplify",
  "fraction_whole",
  "fraction_numerator",
  "fraction_denominator",
  // the playground: a Khan or bank item written in one language (dl-w3.61.9)
  "written_in_en",
  "written_in_pl",
  "checking",
  "move_up",
  "move_down",
  // dl-w3.61: each lane adds its keys inside its own block, here and in pl.ts and en.ts.
  // lane A: text (dl-w3.61.2)
  // end lane A
  // lane B: place core (dl-w3.61.3)
  "point_label",
  "hotspot_area",
  "hotspot_cursor",
  // end lane B
  // lane C: gaps layouts (dl-w3.61.4)
  // Gaps: a written column's cells by place (families/slots/columnLabel.ts)
  "column_r0",
  "column_r1",
  "column_r2",
  "column_r3",
  "column_c1",
  "column_c2",
  "column_c3",
  "pyramid_label",
  // end lane C
  // lane D: clock (dl-w3.61.5)
  "clock_face",
  "clock_hour_hand",
  "clock_minute_hand",
  "clock_pick_hand",
  "clock_points_at",
  "clock_points_between",
  "incomplete_clock",
  // end lane D
  // lane E: money (dl-w3.61.6)
  "incomplete_coins",
  "coins_bank",
  "coins_tray",
  "coins_add",
  "coins_take_back",
  "coins_slot_empty",
  "coins_total",
  // end lane E
  // lane F: fractions and area (dl-w3.61.7)
  "fraction_shape",
  "fraction_part",
  "incomplete_fraction",
  "split_strip",
  "split_after_col",
  "split_after_row",
  "split_none",
  // end lane F
  // lane I: overview and decisions (dl-w3.61.10)
  // end lane I
  // the Polish letter row under a typed Polish answer (dl-uukj.28)
  "letters_row",
  "letters_capitals",
  "ds_right_short",
  "ds_miss_short",
  "ds_wait_hint",
  "ds_fix_then_check",
  "ds_solution_band",
  "ds_compare_solution",
  "ds_close_tip",
  "ds_your_answer",
  "ds_right_answer",
  "ds_hint_title",
  "ds_wait_choose",
  "ds_wait_enter",
  "ds_wait_gaps",
  "ds_wait_sequence",
  "ds_wait_group",
  "ds_wait_place",
  "ds_wait_explain",
  "ds_wait_compound",
  "ds_wait_word",
  "ds_hint_of",
  // the lesson frame, round 1 (docs/plan/design-system/lesson-frame/copy.md)
  "ds_miss_fix",
  "ds_help_title",
  "ds_solution_label",
  "ds_slow",
  "ds_keys",
  "ds_open_picture",
  "ds_close_picture",
  "ds_more_below",
  "ds_pause_title",
  "ds_pause_text",
  "ds_pause_back",
  "ds_pause_stop",
  "ds_sound",
  "ds_end_title",
  "ds_end_question",
  "ds_end_again",
  "ds_end_similar",
  "ds_end_done",
  "ds_review_bar",
  "ds_progress_start",
  "ds_progress_half",
  "ds_progress_end",
  // end the Polish letter row
  // the source credit on a borrowed question, and the confirmation before a link leaves Jadwigo (dl-uukj.29.136)
  "credit_from",
  "credit_title",
  "credit_label",
  "credit_shared",
  "credit_translated",
  "credit_adapted",
  "credit_both",
  "credit_source",
  "credit_not_affiliated",
  "credit_close",
  "leave_title",
  "leave_where",
  "leave_stay",
  "leave_go",
  // end the source credit
  // the lesson player's end screen and pause (dl-5ssh.3.1)
  "play_congrats",
  "play_results_title",
  "play_results_none",
  "play_ended_correct",
  "play_ended_missed",
  "play_ended_skipped",
  "play_ended_done",
  "play_ended_open",
  "play_results_twin",
  "play_results_help",
  "play_paused",
  "play_paused_back",
  "play_not_found",
  // end the lesson player
  // parent login (dl-e8ov.2.38)
  "play_save",
  "play_save_note",
  "parent_title",
  "parent_off",
  "parent_promise",
  "parent_guardian",
  "parent_email",
  "parent_send_code",
  "parent_send_failed",
  "parent_code",
  "parent_code_sent",
  "parent_sign_in",
  "parent_code_mismatch",
  "parent_add_child",
  "parent_first_name",
  "parent_add",
  "parent_whose",
  "parent_claimed_elsewhere",
  "parent_claim_preview",
  "parent_no_attempts",
  "parent_sign_out",
  // end parent login
] as const;

export type CopyKey = (typeof COPY_KEYS)[number];

/** Keys that hold several lines, used in order and cycling. */
export const LIST_KEYS = ["praise", "try_again"] as const satisfies readonly CopyKey[];

export type CopyTable = Record<CopyKey, CopyEntry | CopyEntry[]>;

/** A category's own lines (dl-i952.17): only the keys whose child line does not fit it. */
export type PartialCopyTable = Partial<CopyTable>;
