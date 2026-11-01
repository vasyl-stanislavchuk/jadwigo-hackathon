/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Consent_ReadsInputs */



/**
* | output |
* | --- |
* | "The assistant reads what your request needs: your child's data, names included." |
*
* @param {Chat_Consent_ReadsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_consent_reads = /** @type {((inputs?: Chat_Consent_ReadsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Consent_ReadsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The assistant reads what your request needs: your child's data, names included.")
	return /** @type {LocalizedString} */ ("Asystent czyta to, czego potrzebuje Twoja prośba: dane dziecka, imiona też.")
});