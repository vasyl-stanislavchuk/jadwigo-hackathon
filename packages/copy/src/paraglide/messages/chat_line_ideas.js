/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Line_IdeasInputs */



/**
* | output |
* | --- |
* | "Gathered lesson ideas" |
*
* @param {Chat_Line_IdeasInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_ideas = /** @type {((inputs?: Chat_Line_IdeasInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_IdeasInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Gathered lesson ideas")
	return /** @type {LocalizedString} */ ("Zebrałam pomysły na lekcje")
});