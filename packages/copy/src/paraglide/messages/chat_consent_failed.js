/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Consent_FailedInputs */



/**
* | output |
* | --- |
* | "Your consent wasn't saved. Try again." |
*
* @param {Chat_Consent_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_consent_failed = /** @type {((inputs?: Chat_Consent_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Consent_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Your consent wasn't saved. Try again.")
	return /** @type {LocalizedString} */ ("Nie udało się zapisać zgody. Spróbuj jeszcze raz.")
});