/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Tens_OnlyInputs */



/**
* | output |
* | --- |
* | "Only the tens, the ones left out" |
*
* @param {Parent_Mistake_Tens_OnlyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_tens_only = /** @type {((inputs?: Parent_Mistake_Tens_OnlyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Tens_OnlyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Only the tens, the ones left out")
	return /** @type {LocalizedString} */ ("Same dziesiątki, bez jedności")
});