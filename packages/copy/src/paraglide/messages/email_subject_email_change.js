/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Email_Subject_Email_ChangeInputs */



/**
* | output |
* | --- |
* | "Your code to change your Jadwigo email" |
*
* @param {Email_Subject_Email_ChangeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_subject_email_change = /** @type {((inputs?: Email_Subject_Email_ChangeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_Subject_Email_ChangeInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Your code to change your Jadwigo email")
	return /** @type {LocalizedString} */ ("Twój kod do zmiany adresu e-mail w Jadwigo")
});