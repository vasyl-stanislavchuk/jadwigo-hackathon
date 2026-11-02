/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ child: NonNullable<unknown> }} Chat_Context_ChildInputs */



/**
* | output |
* | --- |
* | "Jadwigo AI sees: {child}" |
*
* @param {Chat_Context_ChildInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_context_child = /** @type {((inputs: Chat_Context_ChildInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Context_ChildInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Jadwigo AI sees: ${i?.child}`)
	return /** @type {LocalizedString} */ (`Jadwigo AI widzi: ${i?.child}`)
});