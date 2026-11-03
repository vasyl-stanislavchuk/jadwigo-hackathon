/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ right: NonNullable<unknown>, total: NonNullable<unknown> }} Parent_List_ScoreInputs */
/**
* | output |
* | --- |
* | "{right} of {total}" |
*
* @param {Parent_List_ScoreInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_score: ((inputs: Parent_List_ScoreInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_ScoreInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_ScoreInputs = {
    right: NonNullable<unknown>;
    total: NonNullable<unknown>;
};
