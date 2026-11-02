/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_This_Computer_SoonInputs */
/**
* | output |
* | --- |
* | "Opening the lesson on this computer is on its way." |
*
* @param {Parent_This_Computer_SoonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_this_computer_soon: ((inputs?: Parent_This_Computer_SoonInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_This_Computer_SoonInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_This_Computer_SoonInputs = {};
