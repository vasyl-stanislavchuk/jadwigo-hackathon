/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ query: NonNullable<unknown>, grade: NonNullable<unknown>, n: NonNullable<unknown> }} Chat_Line_SearchInputs */
/**
* | sets_noun | output |
* | --- | --- |
* | "one" | "Searched “{query}” in grade {grade}: {n} set" |
* | "other" | "Searched “{query}” in grade {grade}: {n} sets" |
*
* @param {Chat_Line_SearchInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_search: ((inputs: Chat_Line_SearchInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_SearchInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_SearchInputs = {
    query: NonNullable<unknown>;
    grade: NonNullable<unknown>;
    n: NonNullable<unknown>;
};
