/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Email_IgnoreInputs */



/**
* | output |
* | --- |
* | "If this wasn't you, you can ignore this email." |
*
* @param {Email_IgnoreInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_ignore = /** @type {((inputs?: Email_IgnoreInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_IgnoreInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("If this wasn't you, you can ignore this email.")
	return /** @type {LocalizedString} */ ("Jeśli to nie Ty, zignoruj tę wiadomość.")
});