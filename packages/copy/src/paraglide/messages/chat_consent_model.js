/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Consent_ModelInputs */



/**
* | output |
* | --- |
* | "That data goes to Meta's models, which may learn from it." |
*
* @param {Chat_Consent_ModelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_consent_model = /** @type {((inputs?: Chat_Consent_ModelInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Consent_ModelInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("That data goes to Meta's models, which may learn from it.")
	return /** @type {LocalizedString} */ ("Te dane trafiają do modeli firmy Meta, które mogą się na nich uczyć.")
});