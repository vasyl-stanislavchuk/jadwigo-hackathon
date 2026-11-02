/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Email_Lead_RecoveryInputs */



/**
* | output |
* | --- |
* | "This is your code to get back into your Jadwigo account. Enter it on the sign-in page." |
*
* @param {Email_Lead_RecoveryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_lead_recovery = /** @type {((inputs?: Email_Lead_RecoveryInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_Lead_RecoveryInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This is your code to get back into your Jadwigo account. Enter it on the sign-in page.")
	return /** @type {LocalizedString} */ ("To jest Twój kod do odzyskania konta Jadwigo. Wpisz go na stronie logowania.")
});