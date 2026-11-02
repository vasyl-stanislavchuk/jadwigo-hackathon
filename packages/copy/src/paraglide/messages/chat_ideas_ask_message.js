/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, list: NonNullable<unknown> }} Chat_Ideas_Ask_MessageInputs */



/**
* | output |
* | --- |
* | "Make a lesson from idea {n}: {list}." |
*
* @param {Chat_Ideas_Ask_MessageInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_ask_message = /** @type {((inputs: Chat_Ideas_Ask_MessageInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Ideas_Ask_MessageInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Make a lesson from idea ${i?.n}: ${i?.list}.`)
	return /** @type {LocalizedString} */ (`Ułóż lekcję z pomysłu ${i?.n}: ${i?.list}.`)
});