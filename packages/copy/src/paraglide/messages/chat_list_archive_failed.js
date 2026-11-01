/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_List_Archive_FailedInputs */



/**
* | output |
* | --- |
* | "The conversation wasn't archived. Try again." |
*
* @param {Chat_List_Archive_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_list_archive_failed = /** @type {((inputs?: Chat_List_Archive_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_List_Archive_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The conversation wasn't archived. Try again.")
	return /** @type {LocalizedString} */ ("Nie udało się zarchiwizować rozmowy. Spróbuj jeszcze raz.")
});