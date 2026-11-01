/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Attach_Limit_DayInputs */



/**
* | output |
* | --- |
* | "That is all the photos for today. You can add more tomorrow" |
*
* @param {Attach_Limit_DayInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_limit_day = /** @type {((inputs?: Attach_Limit_DayInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_Limit_DayInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("That is all the photos for today. You can add more tomorrow")
	return /** @type {LocalizedString} */ ("Na dziś to już wszystkie zdjęcia. Jutro można dodać kolejne")
});