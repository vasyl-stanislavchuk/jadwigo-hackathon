/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Consent_AcceptInputs */



/**
* | output |
* | --- |
* | "Accept" |
*
* @param {Consent_AcceptInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const consent_accept = /** @type {((inputs?: Consent_AcceptInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Consent_AcceptInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Accept")
	return /** @type {LocalizedString} */ ("Akceptuję")
});