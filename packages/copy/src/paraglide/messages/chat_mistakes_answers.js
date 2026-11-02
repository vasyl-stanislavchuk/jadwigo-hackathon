/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Mistakes_AnswersInputs */



/**
* | output |
* | --- |
* | "The child's answers" |
*
* @param {Chat_Mistakes_AnswersInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_mistakes_answers = /** @type {((inputs?: Chat_Mistakes_AnswersInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Mistakes_AnswersInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The child's answers")
	return /** @type {LocalizedString} */ ("Odpowiedzi dziecka")
});