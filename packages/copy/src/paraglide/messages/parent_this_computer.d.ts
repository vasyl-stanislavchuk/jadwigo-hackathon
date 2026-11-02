/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_This_ComputerInputs */
/**
* | output |
* | --- |
* | "Open on this computer" |
*
* @param {Parent_This_ComputerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_this_computer: ((inputs?: Parent_This_ComputerInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_This_ComputerInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_This_ComputerInputs = {};
