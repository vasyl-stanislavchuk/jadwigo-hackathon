/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ x: NonNullable<unknown>, y: NonNullable<unknown> }} Hotspot_CursorInputs */



/**
* | output |
* | --- |
* | "Target: {x} from the left, {y} from the top" |
*
* @param {Hotspot_CursorInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const hotspot_cursor = /** @type {((inputs: Hotspot_CursorInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Hotspot_CursorInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Target: ${i?.x} from the left, ${i?.y} from the top`)
	return /** @type {LocalizedString} */ (`Celownik: ${i?.x} od lewej, ${i?.y} od góry`)
});