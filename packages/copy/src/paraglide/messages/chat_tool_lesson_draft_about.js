/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ topic: NonNullable<unknown> }} Chat_Tool_Lesson_Draft_AboutInputs */



/**
* | output |
* | --- |
* | "Drafting a lesson about {topic}" |
*
* @param {Chat_Tool_Lesson_Draft_AboutInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lesson_draft_about = /** @type {((inputs: Chat_Tool_Lesson_Draft_AboutInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Lesson_Draft_AboutInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Drafting a lesson about ${i?.topic}`)
	return /** @type {LocalizedString} */ (`Układam lekcję o: ${i?.topic}`)
});