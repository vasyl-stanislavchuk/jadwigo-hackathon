/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ value: NonNullable<unknown> }} Coins_AddInputs */
/**
* | output |
* | --- |
* | "Put {value} in the tray" |
*
* @param {Coins_AddInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const coins_add: ((inputs: Coins_AddInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Coins_AddInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Coins_AddInputs = {
    value: NonNullable<unknown>;
};
