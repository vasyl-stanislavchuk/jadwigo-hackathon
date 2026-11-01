/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Credit_Not_Affiliated_AlfikInputs */
/**
* | output |
* | --- |
* | "Jadwigo is not affiliated with Alfik Matematyczny." |
*
* @param {Credit_Not_Affiliated_AlfikInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_not_affiliated_alfik: ((inputs?: Credit_Not_Affiliated_AlfikInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_Not_Affiliated_AlfikInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_Not_Affiliated_AlfikInputs = {};
