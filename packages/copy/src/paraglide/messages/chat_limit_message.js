/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Limit_MessageInputs */



/**
* | output |
* | --- |
* | "The assistant can't take more messages right now. Try again later." |
*
* @param {Chat_Limit_MessageInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_limit_message = /** @type {((inputs?: Chat_Limit_MessageInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Limit_MessageInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The assistant can't take more messages right now. Try again later.")
	return /** @type {LocalizedString} */ ("Na razie asystent nie przyjmie więcej wiadomości. Spróbuj ponownie później.")
});