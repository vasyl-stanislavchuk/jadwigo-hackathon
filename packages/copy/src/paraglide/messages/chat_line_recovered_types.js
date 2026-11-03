/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Line_Recovered_TypesInputs */



/**
* | output |
* | --- |
* | "Couldn't check the question types, so I built the lesson without them" |
*
* @param {Chat_Line_Recovered_TypesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_recovered_types = /** @type {((inputs?: Chat_Line_Recovered_TypesInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_Recovered_TypesInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Couldn't check the question types, so I built the lesson without them")
	return /** @type {LocalizedString} */ ("Nie dało się sprawdzić rodzajów zadań, więc ułożyłam lekcję bez tego")
});