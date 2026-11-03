/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Finding_Harsh_WordInputs */



/**
* | output |
* | --- |
* | "A child would read a word that is too harsh here." |
*
* @param {Chat_Finding_Harsh_WordInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_harsh_word = /** @type {((inputs?: Chat_Finding_Harsh_WordInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Finding_Harsh_WordInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A child would read a word that is too harsh here.")
	return /** @type {LocalizedString} */ ("Dziecko przeczyta tu za ostre słowo.")
});