/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ label: NonNullable<unknown> }} Point_LabelInputs */
/**
* | output |
* | --- |
* | "Point: {label}" |
*
* @param {Point_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const point_label: ((inputs: Point_LabelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Point_LabelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Point_LabelInputs = {
    label: NonNullable<unknown>;
};
