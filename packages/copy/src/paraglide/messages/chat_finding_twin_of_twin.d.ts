/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Twin_Of_TwinInputs */
/**
* | output |
* | --- |
* | "The similar question has its own similar question; only the question may have one." |
*
* @param {Chat_Finding_Twin_Of_TwinInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_twin_of_twin: ((inputs?: Chat_Finding_Twin_Of_TwinInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Twin_Of_TwinInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Twin_Of_TwinInputs = {};
