/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Play_Print_PreparingInputs */



/**
* | output |
* | --- |
* | "Getting the sheet ready…" |
*
* @param {Play_Print_PreparingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_print_preparing = /** @type {((inputs?: Play_Print_PreparingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Print_PreparingInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Getting the sheet ready…")
	return /** @type {LocalizedString} */ ("Przygotowuję kartkę…")
});