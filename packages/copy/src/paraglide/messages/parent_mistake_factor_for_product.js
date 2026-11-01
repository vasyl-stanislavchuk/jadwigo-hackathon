/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Factor_For_ProductInputs */



/**
* | output |
* | --- |
* | "Factor where product was asked" |
*
* @param {Parent_Mistake_Factor_For_ProductInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_factor_for_product = /** @type {((inputs?: Parent_Mistake_Factor_For_ProductInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Factor_For_ProductInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Factor where product was asked")
	return /** @type {LocalizedString} */ ("Czynnik zamiast iloczynu")
});