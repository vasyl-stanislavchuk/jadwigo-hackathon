/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Lines_EarlierInputs */



/**
* | output |
* | --- |
* | "{n} earlier" |
*
* @param {Chat_Lines_EarlierInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lines_earlier = /** @type {((inputs: Chat_Lines_EarlierInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Lines_EarlierInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.n} earlier`)
	return /** @type {LocalizedString} */ (`${i?.n} wcześniej`)
});