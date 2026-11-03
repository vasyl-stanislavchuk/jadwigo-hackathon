/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Line_Check_OkInputs */



/**
* | output |
* | --- |
* | "Checked the lesson: all good" |
*
* @param {Chat_Line_Check_OkInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_check_ok = /** @type {((inputs?: Chat_Line_Check_OkInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_Check_OkInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Checked the lesson: all good")
	return /** @type {LocalizedString} */ ("Sprawdziłam lekcję: wszystko w porządku")
});