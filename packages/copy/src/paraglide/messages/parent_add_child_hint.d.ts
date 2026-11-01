/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Add_Child_HintInputs */
/**
* | output |
* | --- |
* | "Name and class. Jadwigo will start following what they can do." |
*
* @param {Parent_Add_Child_HintInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_add_child_hint: ((inputs?: Parent_Add_Child_HintInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Add_Child_HintInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Add_Child_HintInputs = {};
