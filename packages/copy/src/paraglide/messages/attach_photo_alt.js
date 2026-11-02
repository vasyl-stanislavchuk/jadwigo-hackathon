/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Attach_Photo_AltInputs */



/**
* | output |
* | --- |
* | "Photo {n}" |
*
* @param {Attach_Photo_AltInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_photo_alt = /** @type {((inputs: Attach_Photo_AltInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_Photo_AltInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Photo ${i?.n}`)
	return /** @type {LocalizedString} */ (`Zdjęcie ${i?.n}`)
});