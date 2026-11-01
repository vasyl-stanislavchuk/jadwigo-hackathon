/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ amount: NonNullable<unknown> }} Coins_TotalInputs */
/**
* | output |
* | --- |
* | "In the tray: {amount}" |
*
* @param {Coins_TotalInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const coins_total: ((inputs: Coins_TotalInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Coins_TotalInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Coins_TotalInputs = {
    amount: NonNullable<unknown>;
};
