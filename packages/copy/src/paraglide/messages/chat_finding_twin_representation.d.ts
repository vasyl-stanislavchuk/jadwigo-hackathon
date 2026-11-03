/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Twin_RepresentationInputs */
/**
* | output |
* | --- |
* | "The similar question asks differently from this one." |
*
* @param {Chat_Finding_Twin_RepresentationInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_twin_representation: ((inputs?: Chat_Finding_Twin_RepresentationInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Twin_RepresentationInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Twin_RepresentationInputs = {};
