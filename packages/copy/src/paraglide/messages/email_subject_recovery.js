/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Email_Subject_RecoveryInputs */



/**
* | output |
* | --- |
* | "Your code to get back into Jadwigo" |
*
* @param {Email_Subject_RecoveryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_subject_recovery = /** @type {((inputs?: Email_Subject_RecoveryInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_Subject_RecoveryInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Your code to get back into Jadwigo")
	return /** @type {LocalizedString} */ ("Twój kod do odzyskania konta Jadwigo")
});