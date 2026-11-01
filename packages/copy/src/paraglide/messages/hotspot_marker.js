/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Hotspot_MarkerInputs */



/**
* | output |
* | --- |
* | "Tap {n}, tap again to lift it" |
*
* @param {Hotspot_MarkerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const hotspot_marker = /** @type {((inputs: Hotspot_MarkerInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Hotspot_MarkerInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Tap ${i?.n}, tap again to lift it`)
	return /** @type {LocalizedString} */ (`Dotknięcie ${i?.n}, dotknij znowu, aby je zdjąć`)
});