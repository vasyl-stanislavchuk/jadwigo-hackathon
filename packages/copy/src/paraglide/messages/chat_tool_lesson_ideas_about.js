/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ child: NonNullable<unknown> }} Chat_Tool_Lesson_Ideas_AboutInputs */



/**
* | output |
* | --- |
* | "Finding lesson ideas · {child}" |
*
* @param {Chat_Tool_Lesson_Ideas_AboutInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lesson_ideas_about = /** @type {((inputs: Chat_Tool_Lesson_Ideas_AboutInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Lesson_Ideas_AboutInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Finding lesson ideas · ${i?.child}`)
	return /** @type {LocalizedString} */ (`Szukanie pomysłów na lekcję · ${i?.child}`)
});