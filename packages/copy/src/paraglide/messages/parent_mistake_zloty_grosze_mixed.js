/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Zloty_Grosze_MixedInputs */



/**
* | output |
* | --- |
* | "The 2 units of Polish money mixed up" |
*
* @param {Parent_Mistake_Zloty_Grosze_MixedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_zloty_grosze_mixed = /** @type {((inputs?: Parent_Mistake_Zloty_Grosze_MixedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Zloty_Grosze_MixedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The 2 units of Polish money mixed up")
	return /** @type {LocalizedString} */ ("Pomylone złote z groszami")
});