/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ source: NonNullable<unknown> }} Credit_TitleInputs */
/**
* | output |
* | --- |
* | "Task from {source}" |
*
* @param {Credit_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_title: ((inputs: Credit_TitleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_TitleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_TitleInputs = {
    source: NonNullable<unknown>;
};
