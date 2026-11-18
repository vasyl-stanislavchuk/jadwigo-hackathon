/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Ai_SwitchInputs */
/**
* | output |
* | --- |
* | "Consent to Jadwigo AI" |
*
* @param {Parent_Ai_SwitchInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_ai_switch: ((inputs?: Parent_Ai_SwitchInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Ai_SwitchInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Ai_SwitchInputs = {};
