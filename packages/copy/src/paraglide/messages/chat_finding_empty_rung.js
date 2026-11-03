/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Finding_Empty_RungInputs */



/**
* | output |
* | --- |
* | "A hint is missing." |
*
* @param {Chat_Finding_Empty_RungInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_empty_rung = /** @type {((inputs?: Chat_Finding_Empty_RungInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Finding_Empty_RungInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A hint is missing.")
	return /** @type {LocalizedString} */ ("Brakuje jednej podpowiedzi.")
});