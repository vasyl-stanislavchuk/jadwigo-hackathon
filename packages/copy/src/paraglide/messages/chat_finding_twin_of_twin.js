/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Finding_Twin_Of_TwinInputs */



/**
* | output |
* | --- |
* | "The similar question has its own similar question; only the question may have one." |
*
* @param {Chat_Finding_Twin_Of_TwinInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_twin_of_twin = /** @type {((inputs?: Chat_Finding_Twin_Of_TwinInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Finding_Twin_Of_TwinInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The similar question has its own similar question; only the question may have one.")
	return /** @type {LocalizedString} */ ("Podobne pytanie ma swoje własne podobne pytanie, a może mieć tylko zadanie.")
});