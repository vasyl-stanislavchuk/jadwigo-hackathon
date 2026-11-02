/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Context_LessonInputs */



/**
* | output |
* | --- |
* | "Jadwigo AI sees: this lesson" |
*
* @param {Chat_Context_LessonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_context_lesson = /** @type {((inputs?: Chat_Context_LessonInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Context_LessonInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Jadwigo AI sees: this lesson")
	return /** @type {LocalizedString} */ ("Jadwigo AI widzi: tę lekcję")
});