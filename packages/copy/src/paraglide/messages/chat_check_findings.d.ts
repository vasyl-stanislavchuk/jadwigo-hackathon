/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Check_FindingsInputs */
/**
* | notes_noun | output |
* | --- | --- |
* | "one" | "{n} note to fix" |
* | "other" | "{n} notes to fix" |
*
* @param {Chat_Check_FindingsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_check_findings: ((inputs: Chat_Check_FindingsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Check_FindingsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Check_FindingsInputs = {
    n: NonNullable<unknown>;
};
