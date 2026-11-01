/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Coins_BankInputs */
/**
* | output |
* | --- |
* | "Coins and notes" |
*
* @param {Coins_BankInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const coins_bank: ((inputs?: Coins_BankInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Coins_BankInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Coins_BankInputs = {};
