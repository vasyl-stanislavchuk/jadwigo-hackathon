/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Print_HintInputs */



/**
* | output |
* | --- |
* | "A sheet with the questions, no answers" |
*
* @param {Parent_Print_HintInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_print_hint = /** @type {((inputs?: Parent_Print_HintInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Print_HintInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A sheet with the questions, no answers")
	return /** @type {LocalizedString} */ ("Kartka z zadaniami, bez odpowiedzi")
});