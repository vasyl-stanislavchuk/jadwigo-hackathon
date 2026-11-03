/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ k: NonNullable<unknown>, t: NonNullable<unknown> }} Chat_Summary_MetaInputs */
/**
* | steps_noun | output |
* | --- | --- |
* | "one" | "{k} step · {t}" |
* | "other" | "{k} steps · {t}" |
*
* @param {Chat_Summary_MetaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_summary_meta: ((inputs: Chat_Summary_MetaInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Summary_MetaInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Summary_MetaInputs = {
    k: NonNullable<unknown>;
    t: NonNullable<unknown>;
};
