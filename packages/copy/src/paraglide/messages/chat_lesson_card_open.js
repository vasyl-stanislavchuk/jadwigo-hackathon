/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Lesson_Card_OpenInputs */



/**
* | output |
* | --- |
* | "Open" |
*
* @param {Chat_Lesson_Card_OpenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_card_open = /** @type {((inputs?: Chat_Lesson_Card_OpenInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Lesson_Card_OpenInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Open")
	return /** @type {LocalizedString} */ ("Otwórz")
});