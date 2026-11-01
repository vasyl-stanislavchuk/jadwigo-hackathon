/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ source: NonNullable<unknown> }} Credit_Not_AffiliatedInputs */
/**
* | output |
* | --- |
* | "Jadwigo is not affiliated with {source}" |
*
* @param {Credit_Not_AffiliatedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_not_affiliated: ((inputs: Credit_Not_AffiliatedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_Not_AffiliatedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_Not_AffiliatedInputs = {
    source: NonNullable<unknown>;
};
