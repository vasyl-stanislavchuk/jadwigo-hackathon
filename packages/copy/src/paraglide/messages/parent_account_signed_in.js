/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Account_Signed_InInputs */



/**
* | output |
* | --- |
* | "You're signed in on this device. Sign out when it isn't yours." |
*
* @param {Parent_Account_Signed_InInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_account_signed_in = /** @type {((inputs?: Parent_Account_Signed_InInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Account_Signed_InInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("You're signed in on this device. Sign out when it isn't yours.")
	return /** @type {LocalizedString} */ ("Jesteś zalogowany na tym urządzeniu. Wyloguj się, gdy korzystasz z cudzego.")
});