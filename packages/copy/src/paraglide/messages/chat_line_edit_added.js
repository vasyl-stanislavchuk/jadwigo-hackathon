/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, topic: NonNullable<unknown> }} Chat_Line_Edit_AddedInputs */



/**
* | output |
* | --- |
* | "Added question {n}: {topic}" |
*
* @param {Chat_Line_Edit_AddedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_edit_added = /** @type {((inputs: Chat_Line_Edit_AddedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_Edit_AddedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Added question ${i?.n}: ${i?.topic}`)
	return /** @type {LocalizedString} */ (`Dodałam zadanie ${i?.n}: ${i?.topic}`)
});