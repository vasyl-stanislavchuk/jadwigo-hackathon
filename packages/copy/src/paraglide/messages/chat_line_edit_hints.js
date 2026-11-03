/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ list: NonNullable<unknown> }} Chat_Line_Edit_HintsInputs */



/**
* | output |
* | --- |
* | "Fixed the hints in questions {list}" |
*
* @param {Chat_Line_Edit_HintsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_edit_hints = /** @type {((inputs: Chat_Line_Edit_HintsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_Edit_HintsInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Fixed the hints in questions ${i?.list}`)
	return /** @type {LocalizedString} */ (`Poprawiłam podpowiedzi w zadaniach ${i?.list}`)
});