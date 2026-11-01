/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Tool_Lesson_DraftInputs */



/**
* | output |
* | --- |
* | "Drafting the lesson" |
*
* @param {Chat_Tool_Lesson_DraftInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lesson_draft = /** @type {((inputs?: Chat_Tool_Lesson_DraftInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Lesson_DraftInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Drafting the lesson")
	return /** @type {LocalizedString} */ ("Układam lekcję")
});