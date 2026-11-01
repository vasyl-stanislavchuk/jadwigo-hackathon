/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

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
export const tile_slot_empty = /** @type {((inputs: Tile_Slot_EmptyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Tile_Slot_EmptyInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Place ${i?.n}, empty`)
	return /** @type {LocalizedString} */ (`Miejsce ${i?.n}, puste`)
});