/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Tool_Lesson_CheckInputs */



/**
* | output |
* | --- |
* | "Checking the lesson" |
*
* @param {Chat_Tool_Lesson_CheckInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lesson_check = /** @type {((inputs?: Chat_Tool_Lesson_CheckInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Lesson_CheckInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Checking the lesson")
	return /** @type {LocalizedString} */ ("Sprawdzam lekcję")
});