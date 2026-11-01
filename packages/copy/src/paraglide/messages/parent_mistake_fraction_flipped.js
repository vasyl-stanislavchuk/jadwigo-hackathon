/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Fraction_FlippedInputs */



/**
* | output |
* | --- |
* | "The fraction upside down" |
*
* @param {Parent_Mistake_Fraction_FlippedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_fraction_flipped = /** @type {((inputs?: Parent_Mistake_Fraction_FlippedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Fraction_FlippedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The fraction upside down")
	return /** @type {LocalizedString} */ ("Odwrócony ułamek")
});