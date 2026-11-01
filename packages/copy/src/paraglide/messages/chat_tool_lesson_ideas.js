/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Tool_Lesson_IdeasInputs */



/**
* | output |
* | --- |
* | "Finding ideas for the next lesson" |
*
* @param {Chat_Tool_Lesson_IdeasInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lesson_ideas = /** @type {((inputs?: Chat_Tool_Lesson_IdeasInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Lesson_IdeasInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Finding ideas for the next lesson")
	return /** @type {LocalizedString} */ ("Szukam pomysłów na następną lekcję")
});