/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ value: NonNullable<unknown> }} Number_Line_MarkerInputs */
/**
* | output |
* | --- |
* | "Marker at {value}" |
*
* @param {Number_Line_MarkerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const number_line_marker: ((inputs: Number_Line_MarkerInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Number_Line_MarkerInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Number_Line_MarkerInputs = {
    value: NonNullable<unknown>;
};
