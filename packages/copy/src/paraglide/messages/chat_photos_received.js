/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Photos_ReceivedInputs */



/**
* | output |
* | --- |
* | "What Jadwigo received" |
*
* @param {Chat_Photos_ReceivedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_photos_received = /** @type {((inputs?: Chat_Photos_ReceivedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Photos_ReceivedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("What Jadwigo received")
	return /** @type {LocalizedString} */ ("Tak Jadwigo widzi zdjęcia")
});