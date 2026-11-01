/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Swapped_DigitsInputs */



/**
* | output |
* | --- |
* | "The digits swapped" |
*
* @param {Parent_Mistake_Swapped_DigitsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_swapped_digits = /** @type {((inputs?: Parent_Mistake_Swapped_DigitsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Swapped_DigitsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The digits swapped")
	return /** @type {LocalizedString} */ ("Zamienione cyfry")
});