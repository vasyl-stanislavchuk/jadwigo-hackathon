/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Attach_Too_LargeInputs */
/**
* | output |
* | --- |
* | "This photo is too large even after shrinking it. Take a screenshot and add that instead" |
*
* @param {Attach_Too_LargeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_too_large: ((inputs?: Attach_Too_LargeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_Too_LargeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_Too_LargeInputs = {};
