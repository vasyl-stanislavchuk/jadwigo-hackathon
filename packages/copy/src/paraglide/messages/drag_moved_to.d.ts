/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ item: NonNullable<unknown>, n: NonNullable<unknown> }} Drag_Moved_ToInputs */
/**
* | output |
* | --- |
* | "{item} is now in place {n}." |
*
* @param {Drag_Moved_ToInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const drag_moved_to: ((inputs: Drag_Moved_ToInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Drag_Moved_ToInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Drag_Moved_ToInputs = {
    item: NonNullable<unknown>;
    n: NonNullable<unknown>;
};
