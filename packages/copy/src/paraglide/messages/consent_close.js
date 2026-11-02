/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Consent_CloseInputs */



/**
* | output |
* | --- |
* | "Close" |
*
* @param {Consent_CloseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const consent_close = /** @type {((inputs?: Consent_CloseInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Consent_CloseInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Close")
	return /** @type {LocalizedString} */ ("Zamknij")
});