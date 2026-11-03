/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Steer_PhotosInputs */



/**
* | photos_noun | output |
* | --- | --- |
* | "one" | "“{n} photo”" |
* | "other" | "“{n} photos”" |
*
* @param {Chat_Steer_PhotosInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_steer_photos = /** @type {((inputs: Chat_Steer_PhotosInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Steer_PhotosInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const photos_noun = registry.plural("en", i?.n, {}, true);
		if (photos_noun === "one") return /** @type {LocalizedString} */ (`“${i?.n} photo”`);
		if (photos_noun === "other") return /** @type {LocalizedString} */ (`“${i?.n} photos”`);
		return /** @type {LocalizedString} */ ("chat_steer_photos");
	}
	{
		const photos_noun = registry.plural("pl", i?.n, {}, true);
		if (photos_noun === "one") return /** @type {LocalizedString} */ (`„${i?.n} zdjęcie”`);
		if (photos_noun === "few") return /** @type {LocalizedString} */ (`„${i?.n} zdjęcia”`);
		if (photos_noun === "many") return /** @type {LocalizedString} */ (`„${i?.n} zdjęć”`);
		if (photos_noun === "other") return /** @type {LocalizedString} */ (`„${i?.n} zdjęcia”`);
		return /** @type {LocalizedString} */ ("chat_steer_photos");
	}
});