/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Incomplete_CoinsInputs */
/**
* | output |
* | --- |
* | "Put some coins in the tray first." |
*
* @param {Incomplete_CoinsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const incomplete_coins: ((inputs?: Incomplete_CoinsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Incomplete_CoinsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Incomplete_CoinsInputs = {};
