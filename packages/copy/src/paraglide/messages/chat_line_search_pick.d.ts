/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, grade: NonNullable<unknown> }} Chat_Line_Search_PickInputs */
/**
* | sets_noun | output |
* | --- | --- |
* | "one" | "Picked {n} set that fits grade {grade}" |
* | "other" | "Picked {n} sets that fit grade {grade}" |
*
* @param {Chat_Line_Search_PickInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_search_pick: ((inputs: Chat_Line_Search_PickInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_Search_PickInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_Search_PickInputs = {
    n: NonNullable<unknown>;
    grade: NonNullable<unknown>;
};
