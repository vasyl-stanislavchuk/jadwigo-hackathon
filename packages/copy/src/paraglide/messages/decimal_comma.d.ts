/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Decimal_CommaInputs */
/**
* | output |
* | --- |
* | "Comma" |
*
* @param {Decimal_CommaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const decimal_comma: ((inputs?: Decimal_CommaInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Decimal_CommaInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Decimal_CommaInputs = {};
