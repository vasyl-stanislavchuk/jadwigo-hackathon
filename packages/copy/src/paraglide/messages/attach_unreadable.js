/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Attach_UnreadableInputs */



/**
* | output |
* | --- |
* | "We can't open this file as a photo. Pick a photo or a screenshot" |
*
* @param {Attach_UnreadableInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_unreadable = /** @type {((inputs?: Attach_UnreadableInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_UnreadableInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("We can't open this file as a photo. Pick a photo or a screenshot")
	return /** @type {LocalizedString} */ ("Tego pliku nie umiemy otworzyć jako zdjęcia. Wybierz zdjęcie albo zrzut ekranu")
});