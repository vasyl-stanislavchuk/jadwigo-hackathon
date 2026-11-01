/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Choose_RecommendedInputs */
/**
* | output |
* | --- |
* | "recommended" |
*
* @param {Chat_Choose_RecommendedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_choose_recommended: ((inputs?: Chat_Choose_RecommendedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Choose_RecommendedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Choose_RecommendedInputs = {};
