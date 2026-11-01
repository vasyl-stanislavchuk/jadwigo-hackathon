/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Help_TwinInputs */



/**
* | output |
* | --- |
* | "Now one like it. Your turn!" |
*
* @param {Help_TwinInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const help_twin = /** @type {((inputs?: Help_TwinInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Help_TwinInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Now one like it. Your turn!")
	return /** @type {LocalizedString} */ ("Teraz podobne. Twoja kolej!")
});