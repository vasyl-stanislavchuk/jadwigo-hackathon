/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Divisions_FewerInputs */
/**
* | output |
* | --- |
* | "Fewer parts" |
*
* @param {Divisions_FewerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const divisions_fewer: ((inputs?: Divisions_FewerInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Divisions_FewerInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Divisions_FewerInputs = {};
