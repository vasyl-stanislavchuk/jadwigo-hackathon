/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Give_Refused_ChildInputs */
/**
* | output |
* | --- |
* | "This child isn't in your family. Pick another in “For”." |
*
* @param {Parent_Give_Refused_ChildInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_give_refused_child: ((inputs?: Parent_Give_Refused_ChildInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Give_Refused_ChildInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Give_Refused_ChildInputs = {};
