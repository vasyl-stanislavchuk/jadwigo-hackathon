/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Ideas_NoneInputs */



/**
* | output |
* | --- |
* | "No ideas for the next lesson yet." |
*
* @param {Chat_Ideas_NoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_none = /** @type {((inputs?: Chat_Ideas_NoneInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Ideas_NoneInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("No ideas for the next lesson yet.")
	return /** @type {LocalizedString} */ ("Na razie nie ma pomysłów na następną lekcję.")
});