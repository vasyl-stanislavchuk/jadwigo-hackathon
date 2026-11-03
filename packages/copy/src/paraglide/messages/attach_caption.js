/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Attach_CaptionInputs */



/**
* | output |
* | --- |
* | "This is how Jadwigo sees the photos" |
*
* @param {Attach_CaptionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_caption = /** @type {((inputs?: Attach_CaptionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_CaptionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This is how Jadwigo sees the photos")
	return /** @type {LocalizedString} */ ("Tak Jadwigo widzi zdjęcia")
});