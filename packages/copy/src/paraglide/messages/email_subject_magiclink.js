/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Email_Subject_MagiclinkInputs */



/**
* | output |
* | --- |
* | "Your Jadwigo sign-in code" |
*
* @param {Email_Subject_MagiclinkInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_subject_magiclink = /** @type {((inputs?: Email_Subject_MagiclinkInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_Subject_MagiclinkInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Your Jadwigo sign-in code")
	return /** @type {LocalizedString} */ ("Twój kod do logowania w Jadwigo")
});