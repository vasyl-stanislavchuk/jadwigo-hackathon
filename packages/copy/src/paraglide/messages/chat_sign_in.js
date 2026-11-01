/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Sign_InInputs */



/**
* | output |
* | --- |
* | "Sign in on the parent page first, then come back to the conversation." |
*
* @param {Chat_Sign_InInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_sign_in = /** @type {((inputs?: Chat_Sign_InInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Sign_InInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Sign in on the parent page first, then come back to the conversation.")
	return /** @type {LocalizedString} */ ("Najpierw zaloguj się na stronie rodzica, a potem wróć do rozmowy.")
});