/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Step_LeftInputs */
/**
* | output |
* | --- |
* | "Step left" |
*
* @param {Step_LeftInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const step_left: ((inputs?: Step_LeftInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Step_LeftInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Step_LeftInputs = {};
