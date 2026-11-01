/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ form: NonNullable<unknown> }} Sides_Swapped_FormInputs */
/**
* | output |
* | --- |
* | "Or: {form}" |
*
* @param {Sides_Swapped_FormInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const sides_swapped_form: ((inputs: Sides_Swapped_FormInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Sides_Swapped_FormInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Sides_Swapped_FormInputs = {
    form: NonNullable<unknown>;
};
