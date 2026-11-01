/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Review_First_TryInputs */
/**
* | output |
* | --- |
* | "On the first try" |
*
* @param {Parent_Review_First_TryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_review_first_try: ((inputs?: Parent_Review_First_TryInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Review_First_TryInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Review_First_TryInputs = {};
