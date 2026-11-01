/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Incomplete_Decimal_PointInputs */



/**
* | output |
* | --- |
* | "Write a digit after the decimal point." |
*
* @param {Incomplete_Decimal_PointInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const incomplete_decimal_point = /** @type {((inputs?: Incomplete_Decimal_PointInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Incomplete_Decimal_PointInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Write a digit after the decimal point.")
	return /** @type {LocalizedString} */ ("Dopisz cyfrę po kropce.")
});