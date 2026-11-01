/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Attach_Not_TakenInputs */



/**
* | output |
* | --- |
* | "The server did not take the photo. Try again" |
*
* @param {Attach_Not_TakenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_not_taken = /** @type {((inputs?: Attach_Not_TakenInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_Not_TakenInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The server did not take the photo. Try again")
	return /** @type {LocalizedString} */ ("Serwer nie przyjął zdjęcia. Spróbuj ponownie")
});