/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Twin_RepeatsInputs */
/**
* | output |
* | --- |
* | "The similar question repeats the same sum: the child has already seen its answer." |
*
* @param {Chat_Finding_Twin_RepeatsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_twin_repeats: ((inputs?: Chat_Finding_Twin_RepeatsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Twin_RepeatsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Twin_RepeatsInputs = {};
