/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Email_Subject_ReauthenticationInputs */



/**
* | output |
* | --- |
* | "Your Jadwigo confirmation code" |
*
* @param {Email_Subject_ReauthenticationInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_subject_reauthentication = /** @type {((inputs?: Email_Subject_ReauthenticationInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_Subject_ReauthenticationInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Your Jadwigo confirmation code")
	return /** @type {LocalizedString} */ ("Twój kod potwierdzenia w Jadwigo")
});