/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Finding_Question_Type_FamilyInputs */



/**
* | output |
* | --- |
* | "The question type doesn't match its form." |
*
* @param {Chat_Finding_Question_Type_FamilyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_question_type_family = /** @type {((inputs?: Chat_Finding_Question_Type_FamilyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Finding_Question_Type_FamilyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The question type doesn't match its form.")
	return /** @type {LocalizedString} */ ("Rodzaj zadania nie pasuje do jego formy.")
});