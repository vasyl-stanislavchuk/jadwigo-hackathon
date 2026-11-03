/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ title: NonNullable<unknown> }} Chat_Lesson_Card_Open_NamedInputs */



/**
* | output |
* | --- |
* | "Preview the lesson: {title}" |
*
* @param {Chat_Lesson_Card_Open_NamedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_card_open_named = /** @type {((inputs: Chat_Lesson_Card_Open_NamedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Lesson_Card_Open_NamedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Preview the lesson: ${i?.title}`)
	return /** @type {LocalizedString} */ (`Podgląd lekcji: ${i?.title}`)
});