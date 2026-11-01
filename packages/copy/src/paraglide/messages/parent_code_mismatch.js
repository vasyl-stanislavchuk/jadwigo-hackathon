/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Code_MismatchInputs */



/**
* | output |
* | --- |
* | "That code does not match. Check the email and type it again." |
*
* @param {Parent_Code_MismatchInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_code_mismatch = /** @type {((inputs?: Parent_Code_MismatchInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Code_MismatchInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("That code does not match. Check the email and type it again.")
	return /** @type {LocalizedString} */ ("Ten kod nie pasuje. Sprawdź e-mail i wpisz go jeszcze raz.")
});