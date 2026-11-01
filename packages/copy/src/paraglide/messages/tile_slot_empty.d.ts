/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Tile_Slot_EmptyInputs */
/**
* | output |
* | --- |
* | "Place {n}, empty" |
*
* @param {Tile_Slot_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const tile_slot_empty: ((inputs: Tile_Slot_EmptyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Tile_Slot_EmptyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Tile_Slot_EmptyInputs = {
    n: NonNullable<unknown>;
};
