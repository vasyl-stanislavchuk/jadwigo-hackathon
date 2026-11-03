/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Title_RefusedInputs */
/**
* | output |
* | --- |
* | "We can't use this title. Try other words." |
*
* @param {Parent_Title_RefusedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_title_refused: ((inputs?: Parent_Title_RefusedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Title_RefusedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Title_RefusedInputs = {};
