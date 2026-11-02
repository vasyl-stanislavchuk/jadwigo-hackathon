/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Oauth_FailedInputs */



/**
* | output |
* | --- |
* | "We couldn't connect. Go back to the app and try again." |
*
* @param {Oauth_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_failed = /** @type {((inputs?: Oauth_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Oauth_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("We couldn't connect. Go back to the app and try again.")
	return /** @type {LocalizedString} */ ("Nie udało się połączyć. Wróć do aplikacji i spróbuj jeszcze raz.")
});