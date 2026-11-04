/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Play_Print_SlowInputs */



/**
* | output |
* | --- |
* | "The sheet is still on its way. Try again in a moment." |
*
* @param {Play_Print_SlowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_print_slow = /** @type {((inputs?: Play_Print_SlowInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Print_SlowInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The sheet is still on its way. Try again in a moment.")
	return /** @type {LocalizedString} */ ("Kartka jeszcze się robi. Spróbuj za chwilę.")
});