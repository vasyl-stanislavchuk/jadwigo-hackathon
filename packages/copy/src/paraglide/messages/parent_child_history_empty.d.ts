/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Child_History_EmptyInputs */
/**
* | output |
* | --- |
* | "Every lesson this child does will appear here, with its result question by question." |
*
* @param {Parent_Child_History_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_child_history_empty: ((inputs?: Parent_Child_History_EmptyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Child_History_EmptyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Child_History_EmptyInputs = {};
