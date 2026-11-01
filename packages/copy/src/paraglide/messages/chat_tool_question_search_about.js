/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ topic: NonNullable<unknown> }} Chat_Tool_Question_Search_AboutInputs */



/**
* | output |
* | --- |
* | "Looking for questions on: {topic}" |
*
* @param {Chat_Tool_Question_Search_AboutInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_question_search_about = /** @type {((inputs: Chat_Tool_Question_Search_AboutInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Question_Search_AboutInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Looking for questions on: ${i?.topic}`)
	return /** @type {LocalizedString} */ (`Szukam zadań o: ${i?.topic}`)
});