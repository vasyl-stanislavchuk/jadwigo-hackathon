/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Tile_ClearedInputs */
/**
* | output |
* | --- |
* | "Place {n} is empty again." |
*
* @param {Tile_ClearedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const tile_cleared: ((inputs: Tile_ClearedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Tile_ClearedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Tile_ClearedInputs = {
    n: NonNullable<unknown>;
};
