/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Give_UnavailableInputs */
/**
* | output |
* | --- |
* | "Giving a lesson works once you're signed in." |
*
* @param {Parent_Give_UnavailableInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_give_unavailable: ((inputs?: Parent_Give_UnavailableInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Give_UnavailableInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Give_UnavailableInputs = {};
