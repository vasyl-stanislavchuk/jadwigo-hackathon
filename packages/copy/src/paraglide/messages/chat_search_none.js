/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Search_NoneInputs */



/**
* | output |
* | --- |
* | "No question set fits this request yet." |
*
* @param {Chat_Search_NoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_search_none = /** @type {((inputs?: Chat_Search_NoneInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Search_NoneInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("No question set fits this request yet.")
	return /** @type {LocalizedString} */ ("Żaden zestaw zadań nie pasuje jeszcze do tej prośby.")
});