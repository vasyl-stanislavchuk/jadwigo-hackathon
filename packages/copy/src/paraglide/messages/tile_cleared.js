/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

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
export const tile_cleared = /** @type {((inputs: Tile_ClearedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Tile_ClearedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Place ${i?.n} is empty again.`)
	return /** @type {LocalizedString} */ (`Miejsce ${i?.n} jest znowu puste.`)
});