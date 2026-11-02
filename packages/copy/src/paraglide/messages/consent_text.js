/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Consent_TextInputs */



/**
* | output |
* | --- |
* | "We use a single first-party cookie to make Jadwigo better. Nothing goes to advertisers." |
*
* @param {Consent_TextInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const consent_text = /** @type {((inputs?: Consent_TextInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Consent_TextInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("We use a single first-party cookie to make Jadwigo better. Nothing goes to advertisers.")
	return /** @type {LocalizedString} */ ("Używamy jednego własnego pliku cookie, żeby ulepszać Jadwigo. Nic nie trafia do reklamodawców.")
});