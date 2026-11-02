/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ title: NonNullable<unknown> }} Chat_Tool_Lesson_Check_AboutInputs */



/**
* | output |
* | --- |
* | "Checking the lesson: {title}" |
*
* @param {Chat_Tool_Lesson_Check_AboutInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lesson_check_about = /** @type {((inputs: Chat_Tool_Lesson_Check_AboutInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Lesson_Check_AboutInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Checking the lesson: ${i?.title}`)
	return /** @type {LocalizedString} */ (`Sprawdzanie lekcji: ${i?.title}`)
});