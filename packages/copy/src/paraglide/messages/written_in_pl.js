/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Written_In_PlInputs */



/**
* | output |
* | --- |
* | "This item is in Polish." |
*
* @param {Written_In_PlInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const written_in_pl = /** @type {((inputs?: Written_In_PlInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Written_In_PlInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This item is in Polish.")
	return /** @type {LocalizedString} */ ("To zadanie jest po polsku")
});