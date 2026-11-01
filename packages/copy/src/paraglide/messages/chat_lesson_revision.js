/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Lesson_RevisionInputs */



/**
* | output |
* | --- |
* | "Revision {n}" |
*
* @param {Chat_Lesson_RevisionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_revision = /** @type {((inputs: Chat_Lesson_RevisionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Lesson_RevisionInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Revision ${i?.n}`)
	return /** @type {LocalizedString} */ (`Wersja ${i?.n}`)
});