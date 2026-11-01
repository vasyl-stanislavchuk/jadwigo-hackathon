/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Parent_Review_HelpInputs */
/**
* | output |
* | --- |
* | "Help: {n}" |
*
* @param {Parent_Review_HelpInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_review_help: ((inputs: Parent_Review_HelpInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Review_HelpInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Review_HelpInputs = {
    n: NonNullable<unknown>;
};
