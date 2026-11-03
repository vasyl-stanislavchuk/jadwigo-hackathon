/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Print_PreparingInputs */



/**
* | output |
* | --- |
* | "Preparing the sheet…" |
*
* @param {Parent_Print_PreparingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_print_preparing = /** @type {((inputs?: Parent_Print_PreparingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Print_PreparingInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Preparing the sheet…")
	return /** @type {LocalizedString} */ ("Przygotowuję kartkę…")
});