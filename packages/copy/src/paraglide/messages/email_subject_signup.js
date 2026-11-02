/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Email_Subject_SignupInputs */



/**
* | output |
* | --- |
* | "Your Jadwigo code" |
*
* @param {Email_Subject_SignupInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_subject_signup = /** @type {((inputs?: Email_Subject_SignupInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_Subject_SignupInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Your Jadwigo code")
	return /** @type {LocalizedString} */ ("Twój kod do Jadwigo")
});