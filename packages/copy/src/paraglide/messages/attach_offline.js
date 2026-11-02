/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Attach_OfflineInputs */



/**
* | output |
* | --- |
* | "The photo did not get through. Check the connection and try again" |
*
* @param {Attach_OfflineInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_offline = /** @type {((inputs?: Attach_OfflineInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_OfflineInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The photo did not get through. Check the connection and try again")
	return /** @type {LocalizedString} */ ("Zdjęcie nie doszło. Sprawdź połączenie i spróbuj ponownie")
});