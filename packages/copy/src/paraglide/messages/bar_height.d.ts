/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ label: NonNullable<unknown>, value: NonNullable<unknown>, unit: NonNullable<unknown> }} Bar_HeightInputs */
/**
* | output |
* | --- |
* | "{label}: {value} {unit}" |
*
* @param {Bar_HeightInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const bar_height: ((inputs: Bar_HeightInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Bar_HeightInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Bar_HeightInputs = {
    label: NonNullable<unknown>;
    value: NonNullable<unknown>;
    unit: NonNullable<unknown>;
};
