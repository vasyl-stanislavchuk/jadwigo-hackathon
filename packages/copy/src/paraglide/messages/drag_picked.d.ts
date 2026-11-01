/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ item: NonNullable<unknown> }} Drag_PickedInputs */
/**
* | output |
* | --- |
* | "{item}: now tap the right place." |
*
* @param {Drag_PickedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const drag_picked: ((inputs: Drag_PickedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Drag_PickedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Drag_PickedInputs = {
    item: NonNullable<unknown>;
};
