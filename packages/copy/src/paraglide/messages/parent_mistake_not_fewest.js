/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Not_FewestInputs */



/**
* | output |
* | --- |
* | "The right amount, with more coins than needed" |
*
* @param {Parent_Mistake_Not_FewestInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_not_fewest = /** @type {((inputs?: Parent_Mistake_Not_FewestInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Not_FewestInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The right amount, with more coins than needed")
	return /** @type {LocalizedString} */ ("Dobra kwota, ale z większej liczby monet")
});