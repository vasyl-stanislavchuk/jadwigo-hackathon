/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Incomplete_Fraction_BoxesInputs */



/**
* | output |
* | --- |
* | "Write the top and the bottom number." |
*
* @param {Incomplete_Fraction_BoxesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const incomplete_fraction_boxes = /** @type {((inputs?: Incomplete_Fraction_BoxesInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Incomplete_Fraction_BoxesInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Write the top and the bottom number.")
	return /** @type {LocalizedString} */ ("Wpisz licznik i mianownik.")
});