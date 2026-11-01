/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Missing_DiacriticsInputs */



/**
* | output |
* | --- |
* | "The Polish letters' marks left out (ą, ę, ó)" |
*
* @param {Parent_Mistake_Missing_DiacriticsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_missing_diacritics = /** @type {((inputs?: Parent_Mistake_Missing_DiacriticsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Missing_DiacriticsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The Polish letters' marks left out (ą, ę, ó)")
	return /** @type {LocalizedString} */ ("Bez polskich znaków (ą, ę, ó)")
});