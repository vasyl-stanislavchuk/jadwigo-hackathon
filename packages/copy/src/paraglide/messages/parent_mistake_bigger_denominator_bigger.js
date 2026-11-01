/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Bigger_Denominator_BiggerInputs */



/**
* | output |
* | --- |
* | "A bigger denominator taken for a bigger fraction" |
*
* @param {Parent_Mistake_Bigger_Denominator_BiggerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_bigger_denominator_bigger = /** @type {((inputs?: Parent_Mistake_Bigger_Denominator_BiggerInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Bigger_Denominator_BiggerInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A bigger denominator taken for a bigger fraction")
	return /** @type {LocalizedString} */ ("Większy mianownik wzięty za większy ułamek")
});