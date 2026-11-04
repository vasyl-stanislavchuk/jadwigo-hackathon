/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Play_Print_FailedInputs */



/**
* | output |
* | --- |
* | "The sheet didn't come out. Try again." |
*
* @param {Play_Print_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_print_failed = /** @type {((inputs?: Play_Print_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Print_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The sheet didn't come out. Try again.")
	return /** @type {LocalizedString} */ ("Kartka się nie udała. Spróbuj jeszcze raz.")
});