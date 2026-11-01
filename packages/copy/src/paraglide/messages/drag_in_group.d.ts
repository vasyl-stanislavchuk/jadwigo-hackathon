/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ item: NonNullable<unknown>, group: NonNullable<unknown> }} Drag_In_GroupInputs */
/**
* | output |
* | --- |
* | "{item} is in {group}." |
*
* @param {Drag_In_GroupInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const drag_in_group: ((inputs: Drag_In_GroupInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Drag_In_GroupInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Drag_In_GroupInputs = {
    item: NonNullable<unknown>;
    group: NonNullable<unknown>;
};
