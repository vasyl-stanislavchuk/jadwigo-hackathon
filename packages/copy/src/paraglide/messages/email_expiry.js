/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Email_ExpiryInputs */



/**
* | output |
* | --- |
* | "It works for a short time and only once." |
*
* @param {Email_ExpiryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_expiry = /** @type {((inputs?: Email_ExpiryInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_ExpiryInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("It works for a short time and only once.")
	return /** @type {LocalizedString} */ ("Kod działa przez krótki czas i tylko raz.")
});