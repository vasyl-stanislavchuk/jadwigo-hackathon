/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ form: NonNullable<unknown> }} Other_FormInputs */
/**
* | output |
* | --- |
* | "You could also write: {form}" |
*
* @param {Other_FormInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const other_form: ((inputs: Other_FormInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Other_FormInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Other_FormInputs = {
    form: NonNullable<unknown>;
};
