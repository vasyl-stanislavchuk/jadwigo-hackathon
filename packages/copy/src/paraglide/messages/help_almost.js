/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Help_AlmostInputs */



/**
* | output |
* | --- |
* | "Almost there. Now write the last line yourself." |
*
* @param {Help_AlmostInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const help_almost = /** @type {((inputs?: Help_AlmostInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Help_AlmostInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Almost there. Now write the last line yourself.")
	return /** @type {LocalizedString} */ ("Prawie: ostatnią linijkę piszesz ty")
});