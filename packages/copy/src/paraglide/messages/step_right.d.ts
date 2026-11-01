/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Step_RightInputs */
/**
* | output |
* | --- |
* | "Step right" |
*
* @param {Step_RightInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const step_right: ((inputs?: Step_RightInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Step_RightInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Step_RightInputs = {};
