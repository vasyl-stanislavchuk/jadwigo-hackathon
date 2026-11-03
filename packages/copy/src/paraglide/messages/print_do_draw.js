/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Print_Do_DrawInputs */



/**
* | output |
* | --- |
* | "Draw or colour the answer." |
*
* @param {Print_Do_DrawInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const print_do_draw = /** @type {((inputs?: Print_Do_DrawInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Print_Do_DrawInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Draw or colour the answer.")
	return /** @type {LocalizedString} */ ("Narysuj albo pokoloruj odpowiedź.")
});