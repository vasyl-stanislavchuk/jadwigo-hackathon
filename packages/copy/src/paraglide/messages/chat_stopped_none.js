/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Stopped_NoneInputs */



/**
* | output |
* | --- |
* | "Stopped. The lesson is still version {n}; I didn't change anything." |
*
* @param {Chat_Stopped_NoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stopped_none = /** @type {((inputs: Chat_Stopped_NoneInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Stopped_NoneInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Stopped. The lesson is still version ${i?.n}; I didn't change anything.`)
	return /** @type {LocalizedString} */ (`Zatrzymane. Lekcja została w wersji ${i?.n}, nic w niej nie zmieniłam.`)
});