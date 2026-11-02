/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ host: NonNullable<unknown> }} Oauth_AddressInputs */



/**
* | output |
* | --- |
* | "The app's address: {host}" |
*
* @param {Oauth_AddressInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_address = /** @type {((inputs: Oauth_AddressInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Oauth_AddressInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`The app's address: ${i?.host}`)
	return /** @type {LocalizedString} */ (`Adres aplikacji: ${i?.host}`)
});