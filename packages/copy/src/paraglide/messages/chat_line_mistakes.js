/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Line_MistakesInputs */



/**
* | output |
* | --- |
* | "Looked at what was tricky" |
*
* @param {Chat_Line_MistakesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_mistakes = /** @type {((inputs?: Chat_Line_MistakesInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_MistakesInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Looked at what was tricky")
	return /** @type {LocalizedString} */ ("Sprawdziłam, co sprawiło trudność")
});