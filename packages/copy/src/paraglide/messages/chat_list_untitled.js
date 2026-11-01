/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_List_UntitledInputs */



/**
* | output |
* | --- |
* | "Untitled conversation" |
*
* @param {Chat_List_UntitledInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_list_untitled = /** @type {((inputs?: Chat_List_UntitledInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_List_UntitledInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Untitled conversation")
	return /** @type {LocalizedString} */ ("Rozmowa bez tytułu")
});