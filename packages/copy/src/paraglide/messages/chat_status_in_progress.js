/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Status_In_ProgressInputs */



/**
* | output |
* | --- |
* | "Working on it" |
*
* @param {Chat_Status_In_ProgressInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_status_in_progress = /** @type {((inputs?: Chat_Status_In_ProgressInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Status_In_ProgressInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Working on it")
	return /** @type {LocalizedString} */ ("Pracuję nad tym")
});