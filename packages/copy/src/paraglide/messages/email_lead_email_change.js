/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Email_Lead_Email_ChangeInputs */



/**
* | output |
* | --- |
* | "This is your code to change the email address of your Jadwigo account. Enter it where you are changing it." |
*
* @param {Email_Lead_Email_ChangeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_lead_email_change = /** @type {((inputs?: Email_Lead_Email_ChangeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_Lead_Email_ChangeInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This is your code to change the email address of your Jadwigo account. Enter it where you are changing it.")
	return /** @type {LocalizedString} */ ("To jest Twój kod do zmiany adresu e-mail w Jadwigo. Wpisz go tam, gdzie zmieniasz adres.")
});