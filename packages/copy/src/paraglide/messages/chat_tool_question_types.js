/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Tool_Question_TypesInputs */



/**
* | output |
* | --- |
* | "Checking the kinds of questions" |
*
* @param {Chat_Tool_Question_TypesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_question_types = /** @type {((inputs?: Chat_Tool_Question_TypesInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Question_TypesInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Checking the kinds of questions")
	return /** @type {LocalizedString} */ ("Sprawdzanie rodzajów zadań")
});