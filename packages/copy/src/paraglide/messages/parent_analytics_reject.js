/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Analytics_RejectInputs */



/**
* | output |
* | --- |
* | "No, thanks" |
*
* @param {Parent_Analytics_RejectInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_analytics_reject = /** @type {((inputs?: Parent_Analytics_RejectInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Analytics_RejectInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("No, thanks")
	return /** @type {LocalizedString} */ ("Nie, dziękuję")
});