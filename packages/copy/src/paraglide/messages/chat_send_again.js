/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Send_AgainInputs */



/**
* | output |
* | --- |
* | "That didn't send. Try again." |
*
* @param {Chat_Send_AgainInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_send_again = /** @type {((inputs?: Chat_Send_AgainInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Send_AgainInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("That didn't send. Try again.")
	return /** @type {LocalizedString} */ ("Nie udało się wysłać. Spróbuj ponownie.")
});