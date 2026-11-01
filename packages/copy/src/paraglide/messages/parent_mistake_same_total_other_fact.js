/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Same_Total_Other_FactInputs */



/**
* | output |
* | --- |
* | "The same result from another fact" |
*
* @param {Parent_Mistake_Same_Total_Other_FactInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_same_total_other_fact = /** @type {((inputs?: Parent_Mistake_Same_Total_Other_FactInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Same_Total_Other_FactInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The same result from another fact")
	return /** @type {LocalizedString} */ ("Ten sam wynik, inne działanie")
});