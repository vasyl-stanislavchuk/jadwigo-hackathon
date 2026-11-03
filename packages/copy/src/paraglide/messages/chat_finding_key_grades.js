/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Finding_Key_GradesInputs */



/**
* | output |
* | --- |
* | "The right answer would not be marked right." |
*
* @param {Chat_Finding_Key_GradesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_key_grades = /** @type {((inputs?: Chat_Finding_Key_GradesInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Finding_Key_GradesInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The right answer would not be marked right.")
	return /** @type {LocalizedString} */ ("Dobra odpowiedź nie zostałaby zaliczona.")
});