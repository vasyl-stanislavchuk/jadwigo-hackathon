/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Fraction_SimplifyInputs */



/**
* | output |
* | --- |
* | "Can you write this fraction more simply?" |
*
* @param {Fraction_SimplifyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const fraction_simplify = /** @type {((inputs?: Fraction_SimplifyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Fraction_SimplifyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Can you write this fraction more simply?")
	return /** @type {LocalizedString} */ ("Czy możesz zapisać ten ułamek prościej?")
});