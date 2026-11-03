/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ query: NonNullable<unknown>, n: NonNullable<unknown> }} Chat_Line_Search_AnyInputs */
/**
* | sets_noun | output |
* | --- | --- |
* | "one" | "Searched “{query}”: {n} set" |
* | "other" | "Searched “{query}”: {n} sets" |
*
* @param {Chat_Line_Search_AnyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_search_any: ((inputs: Chat_Line_Search_AnyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_Search_AnyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_Search_AnyInputs = {
    query: NonNullable<unknown>;
    n: NonNullable<unknown>;
};
