/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Swapped_OrderInputs */
/**
* | output |
* | --- |
* | "Swapped order" |
*
* @param {Swapped_OrderInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const swapped_order: ((inputs?: Swapped_OrderInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Swapped_OrderInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Swapped_OrderInputs = {};
