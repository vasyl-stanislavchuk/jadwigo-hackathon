/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Unknown_Mistake_ClassInputs */
/**
* | output |
* | --- |
* | "A hint is for a slip this question can't lead to." |
*
* @param {Chat_Finding_Unknown_Mistake_ClassInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_unknown_mistake_class: ((inputs?: Chat_Finding_Unknown_Mistake_ClassInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Unknown_Mistake_ClassInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Unknown_Mistake_ClassInputs = {};
