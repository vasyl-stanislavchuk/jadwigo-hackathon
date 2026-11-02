/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ topic: NonNullable<unknown> }} Chat_Tool_Curriculum_Topics_AboutInputs */



/**
* | output |
* | --- |
* | "Reading the curriculum on {topic}" |
*
* @param {Chat_Tool_Curriculum_Topics_AboutInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_curriculum_topics_about = /** @type {((inputs: Chat_Tool_Curriculum_Topics_AboutInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Curriculum_Topics_AboutInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Reading the curriculum on ${i?.topic}`)
	return /** @type {LocalizedString} */ (`Czytanie podstawy programowej o: ${i?.topic}`)
});