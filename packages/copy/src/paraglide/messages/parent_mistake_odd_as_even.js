/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Odd_As_EvenInputs */



/**
* | output |
* | --- |
* | "An odd number taken for an even one" |
*
* @param {Parent_Mistake_Odd_As_EvenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_odd_as_even = /** @type {((inputs?: Parent_Mistake_Odd_As_EvenInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Odd_As_EvenInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("An odd number taken for an even one")
	return /** @type {LocalizedString} */ ("Liczba nieparzysta wzięta za parzystą")
});