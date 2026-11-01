/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Digit_ReversalInputs */
/**
* | output |
* | --- |
* | "The digits the other way round" |
*
* @param {Parent_Mistake_Digit_ReversalInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_digit_reversal: ((inputs?: Parent_Mistake_Digit_ReversalInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Digit_ReversalInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Digit_ReversalInputs = {};
