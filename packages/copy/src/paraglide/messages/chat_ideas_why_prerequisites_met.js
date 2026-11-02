/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Ideas_Why_Prerequisites_MetInputs */



/**
* | output |
* | --- |
* | "The basics are in place" |
*
* @param {Chat_Ideas_Why_Prerequisites_MetInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_why_prerequisites_met = /** @type {((inputs?: Chat_Ideas_Why_Prerequisites_MetInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Ideas_Why_Prerequisites_MetInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The basics are in place")
	return /** @type {LocalizedString} */ ("Podstawy już są")
});