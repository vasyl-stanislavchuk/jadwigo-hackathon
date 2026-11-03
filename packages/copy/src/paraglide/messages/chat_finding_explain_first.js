/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Finding_Explain_FirstInputs */



/**
* | output |
* | --- |
* | "The lesson opens with an explanation; it should open with a question." |
*
* @param {Chat_Finding_Explain_FirstInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_explain_first = /** @type {((inputs?: Chat_Finding_Explain_FirstInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Finding_Explain_FirstInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The lesson opens with an explanation; it should open with a question.")
	return /** @type {LocalizedString} */ ("Lekcja zaczyna się od wyjaśnienia, a powinna od pytania.")
});