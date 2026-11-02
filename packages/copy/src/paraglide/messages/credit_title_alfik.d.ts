/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Credit_Title_AlfikInputs */
/**
* | output |
* | --- |
* | "Task from Alfik Matematyczny" |
*
* @param {Credit_Title_AlfikInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_title_alfik: ((inputs?: Credit_Title_AlfikInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_Title_AlfikInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_Title_AlfikInputs = {};
