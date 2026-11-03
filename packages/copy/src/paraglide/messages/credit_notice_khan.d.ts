/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Credit_Notice_KhanInputs */
/**
* | output |
* | --- |
* | "All Khan Academy content is available for free at www.khanacademy.org" |
*
* @param {Credit_Notice_KhanInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_notice_khan: ((inputs?: Credit_Notice_KhanInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_Notice_KhanInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_Notice_KhanInputs = {};
