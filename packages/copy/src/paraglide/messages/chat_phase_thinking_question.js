/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Phase_Thinking_QuestionInputs */



/**
* | output |
* | --- |
* | "Thinking about your question" |
*
* @param {Chat_Phase_Thinking_QuestionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_thinking_question = /** @type {((inputs?: Chat_Phase_Thinking_QuestionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Phase_Thinking_QuestionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Thinking about your question")
	return /** @type {LocalizedString} */ ("Zastanawiam się nad pytaniem")
});