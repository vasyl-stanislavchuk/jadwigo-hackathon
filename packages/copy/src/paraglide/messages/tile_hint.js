/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

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
export const tile_hint = /** @type {((inputs?: Tile_HintInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Tile_HintInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Tap a tile, then tap the place it goes. Tap a place to empty it.")
	return /** @type {LocalizedString} */ ("Dotknij kafelka, a potem miejsca, na które idzie. Dotknij miejsca, aby je opróżnić.")
});