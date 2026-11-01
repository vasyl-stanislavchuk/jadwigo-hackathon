/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Parent_Week_Moved_UpInputs */
/**
* | output |
* | --- |
* | "Skills moved forward: {n}" |
*
* @param {Parent_Week_Moved_UpInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_week_moved_up: ((inputs: Parent_Week_Moved_UpInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Week_Moved_UpInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Week_Moved_UpInputs = {
    n: NonNullable<unknown>;
};
