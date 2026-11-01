/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Fact_ErrorInputs */



/**
* | output |
* | --- |
* | "A slip in a basic fact" |
*
* @param {Parent_Mistake_Fact_ErrorInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_fact_error = /** @type {((inputs?: Parent_Mistake_Fact_ErrorInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Fact_ErrorInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A slip in a basic fact")
	return /** @type {LocalizedString} */ ("Pomyłka w prostym działaniu")
});