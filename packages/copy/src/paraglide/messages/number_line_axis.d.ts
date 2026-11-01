/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ min: NonNullable<unknown>, max: NonNullable<unknown> }} Number_Line_AxisInputs */
/**
* | output |
* | --- |
* | "Number line from {min} to {max}" |
*
* @param {Number_Line_AxisInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const number_line_axis: ((inputs: Number_Line_AxisInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Number_Line_AxisInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Number_Line_AxisInputs = {
    min: NonNullable<unknown>;
    max: NonNullable<unknown>;
};
