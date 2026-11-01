/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Children_HintInputs */
/**
* | output |
* | --- |
* | "Add a child so Jadwigo can follow what they can do. Not needed for a lesson." |
*
* @param {Parent_Children_HintInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_children_hint: ((inputs?: Parent_Children_HintInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Children_HintInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Children_HintInputs = {};
