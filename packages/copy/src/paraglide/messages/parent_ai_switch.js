/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Ai_SwitchInputs */



/**
* | output |
* | --- |
* | "Consent to Jadwigo AI" |
*
* @param {Parent_Ai_SwitchInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_ai_switch = /** @type {((inputs?: Parent_Ai_SwitchInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Ai_SwitchInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Consent to Jadwigo AI")
	return /** @type {LocalizedString} */ ("Zgoda na Jadwigo AI")
});