/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Line_WaitingInputs */



/**
* | output |
* | --- |
* | "Waiting for your answer below" |
*
* @param {Chat_Line_WaitingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_waiting = /** @type {((inputs?: Chat_Line_WaitingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_WaitingInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Waiting for your answer below")
	return /** @type {LocalizedString} */ ("Czekam na Twoją odpowiedź poniżej")
});