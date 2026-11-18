/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ date: NonNullable<unknown> }} Parent_Ai_GivenInputs */
/**
* | output |
* | --- |
* | "Given on {date}." |
*
* @param {Parent_Ai_GivenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_ai_given: ((inputs: Parent_Ai_GivenInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Ai_GivenInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Ai_GivenInputs = {
    date: NonNullable<unknown>;
};
