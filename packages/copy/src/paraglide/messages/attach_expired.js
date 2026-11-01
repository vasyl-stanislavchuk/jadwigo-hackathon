/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Attach_ExpiredInputs */



/**
* | output |
* | --- |
* | "The upload took too long. Try again" |
*
* @param {Attach_ExpiredInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_expired = /** @type {((inputs?: Attach_ExpiredInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_ExpiredInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The upload took too long. Try again")
	return /** @type {LocalizedString} */ ("Wysyłanie trwało za długo. Spróbuj ponownie")
});