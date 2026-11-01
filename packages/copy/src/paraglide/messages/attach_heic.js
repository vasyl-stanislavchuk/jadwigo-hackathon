/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Attach_HeicInputs */



/**
* | output |
* | --- |
* | "We can't open this photo. Take a screenshot of it or save it as a JPG" |
*
* @param {Attach_HeicInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_heic = /** @type {((inputs?: Attach_HeicInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_HeicInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("We can't open this photo. Take a screenshot of it or save it as a JPG")
	return /** @type {LocalizedString} */ ("Nie umiemy otworzyć tego zdjęcia. Zrób zrzut ekranu albo zapisz je jako JPG")
});