/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Subtracted_Not_DividedInputs */



/**
* | output |
* | --- |
* | "Subtracted instead of dividing" |
*
* @param {Parent_Mistake_Subtracted_Not_DividedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_subtracted_not_divided = /** @type {((inputs?: Parent_Mistake_Subtracted_Not_DividedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Subtracted_Not_DividedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Subtracted instead of dividing")
	return /** @type {LocalizedString} */ ("Odejmowanie zamiast dzielenia")
});