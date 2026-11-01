/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Lesson_UnreadableInputs */



/**
* | output |
* | --- |
* | "This revision can't be shown yet." |
*
* @param {Chat_Lesson_UnreadableInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_unreadable = /** @type {((inputs?: Chat_Lesson_UnreadableInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Lesson_UnreadableInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This revision can't be shown yet.")
	return /** @type {LocalizedString} */ ("Tej wersji lekcji nie da się jeszcze pokazać.")
});