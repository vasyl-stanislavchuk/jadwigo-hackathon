/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ say: NonNullable<unknown> }} Chat_Lesson_Card_FirstInputs */



/**
* | output |
* | --- |
* | "First: {say}" |
*
* @param {Chat_Lesson_Card_FirstInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_card_first = /** @type {((inputs: Chat_Lesson_Card_FirstInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Lesson_Card_FirstInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`First: ${i?.say}`)
	return /** @type {LocalizedString} */ (`Na początek: ${i?.say}`)
});