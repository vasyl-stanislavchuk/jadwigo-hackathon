/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Rate_FailedInputs */



/**
* | output |
* | --- |
* | "Your rating wasn't saved. Try again." |
*
* @param {Chat_Rate_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_rate_failed = /** @type {((inputs?: Chat_Rate_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Rate_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Your rating wasn't saved. Try again.")
	return /** @type {LocalizedString} */ ("Nie udało się zapisać oceny. Spróbuj jeszcze raz.")
});