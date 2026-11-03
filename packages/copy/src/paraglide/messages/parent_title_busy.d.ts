/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Title_BusyInputs */
/**
* | output |
* | --- |
* | "Jadwigo is changing the lesson. Try again in a moment." |
*
* @param {Parent_Title_BusyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_title_busy: ((inputs?: Parent_Title_BusyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Title_BusyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Title_BusyInputs = {};
