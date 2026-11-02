/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Email_Lead_SignupInputs */



/**
* | output |
* | --- |
* | "This is your Jadwigo code. Enter it on the sign-in page to create your account." |
*
* @param {Email_Lead_SignupInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_lead_signup = /** @type {((inputs?: Email_Lead_SignupInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_Lead_SignupInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This is your Jadwigo code. Enter it on the sign-in page to create your account.")
	return /** @type {LocalizedString} */ ("To jest Twój kod do Jadwigo. Wpisz go na stronie logowania, aby założyć konto.")
});