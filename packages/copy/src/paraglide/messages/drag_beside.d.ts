/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ item: NonNullable<unknown>, other: NonNullable<unknown> }} Drag_BesideInputs */
/**
* | output |
* | --- |
* | "{item} is now beside {other}." |
*
* @param {Drag_BesideInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const drag_beside: ((inputs: Drag_BesideInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Drag_BesideInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Drag_BesideInputs = {
    item: NonNullable<unknown>;
    other: NonNullable<unknown>;
};
