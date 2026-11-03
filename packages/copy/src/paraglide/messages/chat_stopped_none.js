/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Stopped_NoneInputs */



/**
* | output |
* | --- |
* | "Stopped. The lesson is unchanged." |
*
* @param {Chat_Stopped_NoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stopped_none = /** @type {((inputs?: Chat_Stopped_NoneInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Stopped_NoneInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Stopped. The lesson is unchanged.")
	return /** @type {LocalizedString} */ ("Zatrzymane. Lekcja została bez zmian.")
});