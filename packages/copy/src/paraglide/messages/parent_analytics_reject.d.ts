/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Analytics_RejectInputs */
/**
* | output |
* | --- |
* | "No, thanks" |
*
* @param {Parent_Analytics_RejectInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_analytics_reject: ((inputs?: Parent_Analytics_RejectInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Analytics_RejectInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Analytics_RejectInputs = {};
