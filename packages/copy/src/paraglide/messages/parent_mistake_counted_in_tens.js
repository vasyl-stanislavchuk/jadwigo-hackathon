/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Counted_In_TensInputs */



/**
* | output |
* | --- |
* | "Counted in tens instead of ones" |
*
* @param {Parent_Mistake_Counted_In_TensInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_counted_in_tens = /** @type {((inputs?: Parent_Mistake_Counted_In_TensInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Counted_In_TensInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Counted in tens instead of ones")
	return /** @type {LocalizedString} */ ("Liczenie dziesiątkami zamiast jednościami")
});