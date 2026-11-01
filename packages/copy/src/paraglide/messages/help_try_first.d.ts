/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Help_Try_FirstInputs */
/**
* | output |
* | --- |
* | "Try it first. Then I can show you more." |
*
* @param {Help_Try_FirstInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const help_try_first: ((inputs?: Help_Try_FirstInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Help_Try_FirstInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Help_Try_FirstInputs = {};
