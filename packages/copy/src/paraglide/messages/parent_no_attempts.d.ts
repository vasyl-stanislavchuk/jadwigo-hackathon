/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_No_AttemptsInputs */
/**
* | output |
* | --- |
* | "No lessons here yet." |
*
* @param {Parent_No_AttemptsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_no_attempts: ((inputs?: Parent_No_AttemptsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_No_AttemptsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_No_AttemptsInputs = {};
