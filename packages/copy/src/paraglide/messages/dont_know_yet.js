/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Dont_Know_YetInputs */



/**
* | output |
* | --- |
* | "I don't know yet" |
*
* @param {Dont_Know_YetInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const dont_know_yet = /** @type {((inputs?: Dont_Know_YetInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Dont_Know_YetInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("I don't know yet")
	return /** @type {LocalizedString} */ ("Jeszcze nie wiem")
});