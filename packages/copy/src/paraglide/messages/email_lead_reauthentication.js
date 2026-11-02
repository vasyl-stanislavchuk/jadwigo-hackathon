/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Email_Lead_ReauthenticationInputs */



/**
* | output |
* | --- |
* | "This is your code to confirm it's you. Enter it in Jadwigo." |
*
* @param {Email_Lead_ReauthenticationInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_lead_reauthentication = /** @type {((inputs?: Email_Lead_ReauthenticationInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_Lead_ReauthenticationInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This is your code to confirm it's you. Enter it in Jadwigo.")
	return /** @type {LocalizedString} */ ("To jest Twój kod, który potwierdza, że to Ty. Wpisz go w Jadwigo.")
});