/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ day: NonNullable<unknown> }} Parent_Week_OfInputs */
/**
* | output |
* | --- |
* | "Week of {day}" |
*
* @param {Parent_Week_OfInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_week_of: ((inputs: Parent_Week_OfInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Week_OfInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Week_OfInputs = {
    day: NonNullable<unknown>;
};
