/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Skip_Dont_KnowInputs */



/**
* | output |
* | --- |
* | "Didn't know yet" |
*
* @param {Parent_Skip_Dont_KnowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_skip_dont_know = /** @type {((inputs?: Parent_Skip_Dont_KnowInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Skip_Dont_KnowInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Didn't know yet")
	return /** @type {LocalizedString} */ ("Jeszcze nie wie")
});