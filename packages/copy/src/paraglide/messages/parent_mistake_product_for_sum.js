/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Product_For_SumInputs */



/**
* | output |
* | --- |
* | "A product where a sum was asked for" |
*
* @param {Parent_Mistake_Product_For_SumInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_product_for_sum = /** @type {((inputs?: Parent_Mistake_Product_For_SumInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Product_For_SumInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A product where a sum was asked for")
	return /** @type {LocalizedString} */ ("Iloczyn zamiast sumy")
});