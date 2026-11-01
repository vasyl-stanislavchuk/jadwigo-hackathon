/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Confuses_QuotientInputs */



/**
* | output |
* | --- |
* | "The quotient mixed up with another result" |
*
* @param {Parent_Mistake_Confuses_QuotientInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_confuses_quotient = /** @type {((inputs?: Parent_Mistake_Confuses_QuotientInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Confuses_QuotientInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The quotient mixed up with another result")
	return /** @type {LocalizedString} */ ("Iloraz pomylony z innym wynikiem")
});