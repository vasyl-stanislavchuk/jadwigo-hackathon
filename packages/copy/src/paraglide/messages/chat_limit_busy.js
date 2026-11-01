/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Limit_BusyInputs */



/**
* | output |
* | --- |
* | "A lot of messages are coming in. Try again in a moment." |
*
* @param {Chat_Limit_BusyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_limit_busy = /** @type {((inputs?: Chat_Limit_BusyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Limit_BusyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A lot of messages are coming in. Try again in a moment.")
	return /** @type {LocalizedString} */ ("Teraz przychodzi dużo wiadomości. Spróbuj ponownie za chwilę.")
});