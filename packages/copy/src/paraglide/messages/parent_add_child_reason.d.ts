/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Add_Child_ReasonInputs */
/**
* | output |
* | --- |
* | "Type a name so your child knows it is theirs." |
*
* @param {Parent_Add_Child_ReasonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_add_child_reason: ((inputs?: Parent_Add_Child_ReasonInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Add_Child_ReasonInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Add_Child_ReasonInputs = {};
