/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Oauth_Can_ReadInputs */



/**
* | output |
* | --- |
* | "read your family's data and the question bank" |
*
* @param {Oauth_Can_ReadInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_can_read = /** @type {((inputs?: Oauth_Can_ReadInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Oauth_Can_ReadInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("read your family's data and the question bank")
	return /** @type {LocalizedString} */ ("czytać dane Twojej rodziny i bank pytań")
});