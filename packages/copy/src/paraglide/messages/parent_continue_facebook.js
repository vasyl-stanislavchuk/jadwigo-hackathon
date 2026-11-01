/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Continue_FacebookInputs */



/**
* | output |
* | --- |
* | "Continue with Facebook" |
*
* @param {Parent_Continue_FacebookInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_continue_facebook = /** @type {((inputs?: Parent_Continue_FacebookInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Continue_FacebookInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Continue with Facebook")
	return /** @type {LocalizedString} */ ("Kontynuuj z Facebookiem")
});