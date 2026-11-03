/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Email_HintInputs */



/**
* | output |
* | --- |
* | "We send a 6-digit code to this address. No password needed." |
*
* @param {Parent_Email_HintInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_email_hint = /** @type {((inputs?: Parent_Email_HintInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Email_HintInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("We send a 6-digit code to this address. No password needed.")
	return /** @type {LocalizedString} */ ("Wyślemy na ten adres kod z 6 cyfr. Hasło nie jest potrzebne.")
});