/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Fraction_DenominatorInputs */



/**
* | output |
* | --- |
* | "Bottom number" |
*
* @param {Fraction_DenominatorInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const fraction_denominator = /** @type {((inputs?: Fraction_DenominatorInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Fraction_DenominatorInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Bottom number")
	return /** @type {LocalizedString} */ ("Mianownik")
});