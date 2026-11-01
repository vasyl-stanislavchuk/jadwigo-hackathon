/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Same_DecadeInputs */



/**
* | output |
* | --- |
* | "The tens in place, the ones different" |
*
* @param {Parent_Mistake_Same_DecadeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_same_decade = /** @type {((inputs?: Parent_Mistake_Same_DecadeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Same_DecadeInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The tens in place, the ones different")
	return /** @type {LocalizedString} */ ("Dobre dziesiątki, inne jedności")
});