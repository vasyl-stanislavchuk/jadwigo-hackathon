/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ value: NonNullable<unknown> }} Coins_Take_BackInputs */
/**
* | output |
* | --- |
* | "Take {value} back from the tray" |
*
* @param {Coins_Take_BackInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const coins_take_back: ((inputs: Coins_Take_BackInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Coins_Take_BackInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Coins_Take_BackInputs = {
    value: NonNullable<unknown>;
};
