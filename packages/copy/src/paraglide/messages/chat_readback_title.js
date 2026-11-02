/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Readback_TitleInputs */



/**
* | output |
* | --- |
* | "Tasks read · untick what isn't homework · {n}" |
*
* @param {Chat_Readback_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_readback_title = /** @type {((inputs: Chat_Readback_TitleInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Readback_TitleInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Tasks read · untick what isn't homework · ${i?.n}`)
	return /** @type {LocalizedString} */ (`Odczytane zadania · odznacz, co nie jest domowe · ${i?.n}`)
});