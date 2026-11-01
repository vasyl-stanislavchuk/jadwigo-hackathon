/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Tool_Curriculum_TopicsInputs */



/**
* | output |
* | --- |
* | "Reading the school curriculum" |
*
* @param {Chat_Tool_Curriculum_TopicsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_curriculum_topics = /** @type {((inputs?: Chat_Tool_Curriculum_TopicsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Curriculum_TopicsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Reading the school curriculum")
	return /** @type {LocalizedString} */ ("Czytam podstawę programową")
});