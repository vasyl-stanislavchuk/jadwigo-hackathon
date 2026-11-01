/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Confuses_DifferenceInputs */



/**
* | output |
* | --- |
* | "The word \"difference\" taken for another term" |
*
* @param {Parent_Mistake_Confuses_DifferenceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_confuses_difference = /** @type {((inputs?: Parent_Mistake_Confuses_DifferenceInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Confuses_DifferenceInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The word \"difference\" taken for another term")
	return /** @type {LocalizedString} */ ("Słowo różnica w miejscu innego")
});