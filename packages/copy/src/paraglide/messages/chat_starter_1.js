/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Starter_1Inputs */



/**
* | output |
* | --- |
* | "A short lesson on equal groups for grade 2." |
*
* @param {Chat_Starter_1Inputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_starter_1 = /** @type {((inputs?: Chat_Starter_1Inputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Starter_1Inputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A short lesson on equal groups for grade 2.")
	return /** @type {LocalizedString} */ ("Krótka lekcja o równych grupach dla 2 klasy.")
});