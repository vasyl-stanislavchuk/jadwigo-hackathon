/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Empty_RungInputs */
/**
* | output |
* | --- |
* | "A hint is missing." |
*
* @param {Chat_Finding_Empty_RungInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_empty_rung: ((inputs?: Chat_Finding_Empty_RungInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Empty_RungInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Empty_RungInputs = {};
