/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Provider_FailedInputs */



/**
* | output |
* | --- |
* | "That sign-in didn't finish. Try again, or sign in with a code by email." |
*
* @param {Parent_Provider_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_provider_failed = /** @type {((inputs?: Parent_Provider_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Provider_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("That sign-in didn't finish. Try again, or sign in with a code by email.")
	return /** @type {LocalizedString} */ ("Logowanie się nie udało. Spróbuj jeszcze raz albo zaloguj się kodem z e-maila.")
});