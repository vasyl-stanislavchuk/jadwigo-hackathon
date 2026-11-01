/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ licence: NonNullable<unknown> }} Credit_TranslatedInputs */
/**
* | output |
* | --- |
* | "Translated into English by Jadwigo under {licence}" |
*
* @param {Credit_TranslatedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_translated: ((inputs: Credit_TranslatedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_TranslatedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_TranslatedInputs = {
    licence: NonNullable<unknown>;
};
