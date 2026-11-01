/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Add_For_MultiplyInputs */



/**
* | output |
* | --- |
* | "Added instead of multiplying" |
*
* @param {Parent_Mistake_Add_For_MultiplyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_add_for_multiply = /** @type {((inputs?: Parent_Mistake_Add_For_MultiplyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Add_For_MultiplyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Added instead of multiplying")
	return /** @type {LocalizedString} */ ("Dodawanie zamiast mnożenia")
});