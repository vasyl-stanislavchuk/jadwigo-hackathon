/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Child_Skills_EmptyInputs */
/**
* | output |
* | --- |
* | "The child's goals will appear here: what they can do, what you are working on and what comes next." |
*
* @param {Parent_Child_Skills_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_child_skills_empty: ((inputs?: Parent_Child_Skills_EmptyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Child_Skills_EmptyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Child_Skills_EmptyInputs = {};
