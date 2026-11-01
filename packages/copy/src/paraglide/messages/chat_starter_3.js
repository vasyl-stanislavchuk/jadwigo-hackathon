/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Starter_3Inputs */



/**
* | output |
* | --- |
* | "Telling the time for grade 2." |
*
* @param {Chat_Starter_3Inputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_starter_3 = /** @type {((inputs?: Chat_Starter_3Inputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Starter_3Inputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Telling the time for grade 2.")
	return /** @type {LocalizedString} */ ("Odczytywanie godzin na zegarze dla 2 klasy.")
});