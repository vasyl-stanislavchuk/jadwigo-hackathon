/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Stopped_SomeInputs */



/**
* | output |
* | --- |
* | "Stopped. The lesson is now version {n}, with what I managed to change." |
*
* @param {Chat_Stopped_SomeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stopped_some = /** @type {((inputs: Chat_Stopped_SomeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Stopped_SomeInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Stopped. The lesson is now version ${i?.n}, with what I managed to change.`)
	return /** @type {LocalizedString} */ (`Zatrzymane. Lekcja została w wersji ${i?.n}, z tym, co zdążyłam zmienić.`)
});