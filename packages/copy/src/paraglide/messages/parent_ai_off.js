/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Ai_OffInputs */



/**
* | output |
* | --- |
* | "Without it, Jadwigo AI makes no new lessons. You can give it at any time." |
*
* @param {Parent_Ai_OffInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_ai_off = /** @type {((inputs?: Parent_Ai_OffInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Ai_OffInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Without it, Jadwigo AI makes no new lessons. You can give it at any time.")
	return /** @type {LocalizedString} */ ("Bez zgody Jadwigo AI nie przygotuje nowej lekcji. Możesz ją dać w każdej chwili.")
});