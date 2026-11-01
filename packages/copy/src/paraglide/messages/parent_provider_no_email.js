/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Provider_No_EmailInputs */



/**
* | output |
* | --- |
* | "This Facebook account has no email address, so it can't sign in here. Sign in with a code by email instead." |
*
* @param {Parent_Provider_No_EmailInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_provider_no_email = /** @type {((inputs?: Parent_Provider_No_EmailInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Provider_No_EmailInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This Facebook account has no email address, so it can't sign in here. Sign in with a code by email instead.")
	return /** @type {LocalizedString} */ ("To konto na Facebooku nie ma adresu e-mail, więc nie można się nim tu zalogować. Zaloguj się kodem z e-maila.")
});