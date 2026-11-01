/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Turn_UnfinishedInputs */



/**
* | output |
* | --- |
* | "This turn didn't finish. The lesson so far is saved, so you can try again." |
*
* @param {Chat_Turn_UnfinishedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_turn_unfinished = /** @type {((inputs?: Chat_Turn_UnfinishedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Turn_UnfinishedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This turn didn't finish. The lesson so far is saved, so you can try again.")
	return /** @type {LocalizedString} */ ("Tej tury nie udało się dokończyć. Lekcja do tej pory jest zapisana, więc możesz spróbować ponownie.")
});