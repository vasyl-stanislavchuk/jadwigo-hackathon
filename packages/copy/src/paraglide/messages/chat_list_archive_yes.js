/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_List_Archive_YesInputs */



/**
* | output |
* | --- |
* | "Yes, archive" |
*
* @param {Chat_List_Archive_YesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_list_archive_yes = /** @type {((inputs?: Chat_List_Archive_YesInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_List_Archive_YesInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Yes, archive")
	return /** @type {LocalizedString} */ ("Tak, archiwizuj")
});