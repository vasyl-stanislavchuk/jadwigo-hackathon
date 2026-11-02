/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Email_Lead_MagiclinkInputs */



/**
* | output |
* | --- |
* | "This is your Jadwigo code. Enter it on the sign-in page." |
*
* @param {Email_Lead_MagiclinkInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_lead_magiclink = /** @type {((inputs?: Email_Lead_MagiclinkInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_Lead_MagiclinkInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This is your Jadwigo code. Enter it on the sign-in page.")
	return /** @type {LocalizedString} */ ("To jest Twój kod do Jadwigo. Wpisz go na stronie logowania.")
});