/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Queue_Photos_WaitInputs */



/**
* | output |
* | --- |
* | "I'll send photos after this answer." |
*
* @param {Chat_Queue_Photos_WaitInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_queue_photos_wait = /** @type {((inputs?: Chat_Queue_Photos_WaitInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Queue_Photos_WaitInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("I'll send photos after this answer.")
	return /** @type {LocalizedString} */ ("Zdjęcia wyślę dopiero po tej odpowiedzi.")
});