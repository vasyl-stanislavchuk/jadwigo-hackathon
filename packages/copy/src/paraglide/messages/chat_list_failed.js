/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_List_FailedInputs */



/**
* | output |
* | --- |
* | "Your conversations didn't load. Reload the page." |
*
* @param {Chat_List_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_list_failed = /** @type {((inputs?: Chat_List_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_List_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Your conversations didn't load. Reload the page.")
	return /** @type {LocalizedString} */ ("Nie udało się wczytać rozmów. Odśwież stronę.")
});