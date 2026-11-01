/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Consent_KeptInputs */



/**
* | output |
* | --- |
* | "The record of your conversations stays with your family's account until the account is deleted. An archived conversation does too." |
*
* @param {Chat_Consent_KeptInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_consent_kept = /** @type {((inputs?: Chat_Consent_KeptInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Consent_KeptInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The record of your conversations stays with your family's account until the account is deleted. An archived conversation does too.")
	return /** @type {LocalizedString} */ ("Zapis rozmów zostaje przy koncie rodziny, dopóki konto nie zostanie usunięte. Zarchiwizowana rozmowa też.")
});