/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Coins_Slot_EmptyInputs */
/**
* | output |
* | --- |
* | "An empty place" |
*
* @param {Coins_Slot_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const coins_slot_empty: ((inputs?: Coins_Slot_EmptyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Coins_Slot_EmptyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Coins_Slot_EmptyInputs = {};
