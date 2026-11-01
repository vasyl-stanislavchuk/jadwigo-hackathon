/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Starter_2Inputs */



/**
* | output |
* | --- |
* | "Adding within 20 for grade 1, 5 questions." |
*
* @param {Chat_Starter_2Inputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_starter_2 = /** @type {((inputs?: Chat_Starter_2Inputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Starter_2Inputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Adding within 20 for grade 1, 5 questions.")
	return /** @type {LocalizedString} */ ("Dodawanie do 20 dla 1 klasy, 5 zadań.")
});