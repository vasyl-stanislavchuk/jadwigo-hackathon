/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Rate_ThanksInputs */



/**
* | output |
* | --- |
* | "Thank you, your rating is saved." |
*
* @param {Chat_Rate_ThanksInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_rate_thanks = /** @type {((inputs?: Chat_Rate_ThanksInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Rate_ThanksInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Thank you, your rating is saved.")
	return /** @type {LocalizedString} */ ("Dziękujemy, ocena jest zapisana.")
});