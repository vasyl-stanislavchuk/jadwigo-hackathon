/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Phase_Thinking_LessonInputs */



/**
* | output |
* | --- |
* | "Thinking about the lesson" |
*
* @param {Chat_Phase_Thinking_LessonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_thinking_lesson = /** @type {((inputs?: Chat_Phase_Thinking_LessonInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Phase_Thinking_LessonInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Thinking about the lesson")
	return /** @type {LocalizedString} */ ("Zastanawiam się nad lekcją")
});