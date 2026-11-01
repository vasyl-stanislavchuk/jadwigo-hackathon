/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_UndoneInputs */



/**
* | output |
* | --- |
* | "Back to revision {n}" |
*
* @param {Chat_UndoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_undone = /** @type {((inputs: Chat_UndoneInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_UndoneInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Back to revision ${i?.n}`)
	return /** @type {LocalizedString} */ (`Cofnięte do wersji ${i?.n}`)
});