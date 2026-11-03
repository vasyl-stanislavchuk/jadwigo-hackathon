/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ list: NonNullable<unknown> }} Chat_Line_Edit_ChangedInputs */



/**
* | output |
* | --- |
* | "Changed questions {list}" |
*
* @param {Chat_Line_Edit_ChangedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_edit_changed = /** @type {((inputs: Chat_Line_Edit_ChangedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_Edit_ChangedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Changed questions ${i?.list}`)
	return /** @type {LocalizedString} */ (`Poprawiłam zadania ${i?.list}`)
});