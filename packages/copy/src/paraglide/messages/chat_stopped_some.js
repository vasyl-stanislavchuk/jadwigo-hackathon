/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Stopped_SomeInputs */



/**
* | output |
* | --- |
* | "Stopped. The lesson has what I managed to change." |
*
* @param {Chat_Stopped_SomeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stopped_some = /** @type {((inputs?: Chat_Stopped_SomeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Stopped_SomeInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Stopped. The lesson has what I managed to change.")
	return /** @type {LocalizedString} */ ("Zatrzymane. W lekcji jest to, co zdążyłam zmienić.")
});