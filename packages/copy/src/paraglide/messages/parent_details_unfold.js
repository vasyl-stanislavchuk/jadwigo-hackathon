/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Details_UnfoldInputs */



/**
* | output |
* | --- |
* | "Unfold the details" |
*
* @param {Parent_Details_UnfoldInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_details_unfold = /** @type {((inputs?: Parent_Details_UnfoldInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Details_UnfoldInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Unfold the details")
	return /** @type {LocalizedString} */ ("Rozwiń szczegóły")
});