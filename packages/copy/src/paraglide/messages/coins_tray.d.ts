/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Coins_TrayInputs */
/**
* | output |
* | --- |
* | "The tray" |
*
* @param {Coins_TrayInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const coins_tray: ((inputs?: Coins_TrayInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Coins_TrayInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Coins_TrayInputs = {};
