/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Copy_SupportInputs */



/**
* | output |
* | --- |
* | "Copy details for support" |
*
* @param {Chat_Copy_SupportInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_copy_support = /** @type {((inputs?: Chat_Copy_SupportInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Copy_SupportInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Copy details for support")
	return /** @type {LocalizedString} */ ("Kopiuj szczegóły dla pomocy")
});