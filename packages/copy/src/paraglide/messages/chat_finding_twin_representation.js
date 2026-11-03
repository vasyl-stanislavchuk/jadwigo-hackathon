/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Finding_Twin_RepresentationInputs */



/**
* | output |
* | --- |
* | "The similar question asks differently from this one." |
*
* @param {Chat_Finding_Twin_RepresentationInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_twin_representation = /** @type {((inputs?: Chat_Finding_Twin_RepresentationInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Finding_Twin_RepresentationInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The similar question asks differently from this one.")
	return /** @type {LocalizedString} */ ("Podobne pytanie pyta inaczej niż to zadanie.")
});