/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Finding_No_QuestionInputs */



/**
* | output |
* | --- |
* | "The lesson has no question yet." |
*
* @param {Chat_Finding_No_QuestionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_no_question = /** @type {((inputs?: Chat_Finding_No_QuestionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Finding_No_QuestionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The lesson has no question yet.")
	return /** @type {LocalizedString} */ ("W lekcji nie ma jeszcze żadnego pytania.")
});