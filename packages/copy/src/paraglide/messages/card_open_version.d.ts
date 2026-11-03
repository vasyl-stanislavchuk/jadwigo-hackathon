/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Card_Open_VersionInputs */
/**
* | output |
* | --- |
* | "Open this version" |
*
* @param {Card_Open_VersionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_open_version: ((inputs?: Card_Open_VersionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Card_Open_VersionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Card_Open_VersionInputs = {};
