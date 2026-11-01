/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_GuardianInputs */



/**
* | output |
* | --- |
* | "I am this child's parent or guardian." |
*
* @param {Parent_GuardianInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_guardian = /** @type {((inputs?: Parent_GuardianInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_GuardianInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("I am this child's parent or guardian.")
	return /** @type {LocalizedString} */ ("Jestem rodzicem lub opiekunem tego dziecka.")
});