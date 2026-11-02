/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Object_Open_PageInputs */



/**
* | output |
* | --- |
* | "Open on its own page" |
*
* @param {Chat_Object_Open_PageInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_object_open_page = /** @type {((inputs?: Chat_Object_Open_PageInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Object_Open_PageInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Open on its own page")
	return /** @type {LocalizedString} */ ("Otwórz na osobnej stronie")
});