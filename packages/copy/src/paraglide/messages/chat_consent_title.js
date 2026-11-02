/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Consent_TitleInputs */



/**
* | output |
* | --- |
* | "Before you start with Jadwigo AI" |
*
* @param {Chat_Consent_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_consent_title = /** @type {((inputs?: Chat_Consent_TitleInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Consent_TitleInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Before you start with Jadwigo AI")
	return /** @type {LocalizedString} */ ("Zanim zaczniesz z Jadwigo AI")
});