/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Tile_HintInputs */
/**
* | output |
* | --- |
* | "Tap a tile, then tap the place it goes. Tap a place to empty it." |
*
* @param {Tile_HintInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const tile_hint: ((inputs?: Tile_HintInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Tile_HintInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Tile_HintInputs = {};
