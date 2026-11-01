/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Clock_Minute_HandInputs */



/**
* | output |
* | --- |
* | "Minute hand" |
*
* @param {Clock_Minute_HandInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const clock_minute_hand = /** @type {((inputs?: Clock_Minute_HandInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Clock_Minute_HandInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Minute hand")
	return /** @type {LocalizedString} */ ("Wskazówka minutowa")
});