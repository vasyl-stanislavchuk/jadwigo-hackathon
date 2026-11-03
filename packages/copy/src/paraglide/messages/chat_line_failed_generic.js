/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Line_Failed_GenericInputs */



/**
* | output |
* | --- |
* | "This step didn't work, I carried on without it" |
*
* @param {Chat_Line_Failed_GenericInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_failed_generic = /** @type {((inputs?: Chat_Line_Failed_GenericInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_Failed_GenericInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This step didn't work, I carried on without it")
	return /** @type {LocalizedString} */ ("Ten krok się nie udał, poszłam dalej bez niego")
});