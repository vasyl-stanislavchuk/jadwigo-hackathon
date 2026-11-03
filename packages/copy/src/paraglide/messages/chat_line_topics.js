/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Line_TopicsInputs */



/**
* | output |
* | --- |
* | "Looked at the curriculum topics" |
*
* @param {Chat_Line_TopicsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_topics = /** @type {((inputs?: Chat_Line_TopicsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_TopicsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Looked at the curriculum topics")
	return /** @type {LocalizedString} */ ("Przejrzałam tematy z podstawy programowej")
});