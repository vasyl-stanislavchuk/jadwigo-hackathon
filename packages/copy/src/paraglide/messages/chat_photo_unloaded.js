/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Photo_UnloadedInputs */



/**
* | output |
* | --- |
* | "Photo {n} could not be shown" |
*
* @param {Chat_Photo_UnloadedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_photo_unloaded = /** @type {((inputs: Chat_Photo_UnloadedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Photo_UnloadedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Photo ${i?.n} could not be shown`)
	return /** @type {LocalizedString} */ (`Nie udało się pokazać zdjęcia ${i?.n}`)
});