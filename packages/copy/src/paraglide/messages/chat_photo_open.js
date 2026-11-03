/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Photo_OpenInputs */



/**
* | output |
* | --- |
* | "Show photo {n} full size" |
*
* @param {Chat_Photo_OpenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_photo_open = /** @type {((inputs: Chat_Photo_OpenInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Photo_OpenInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Show photo ${i?.n} full size`)
	return /** @type {LocalizedString} */ (`Pokaż zdjęcie ${i?.n} w pełnym rozmiarze`)
});