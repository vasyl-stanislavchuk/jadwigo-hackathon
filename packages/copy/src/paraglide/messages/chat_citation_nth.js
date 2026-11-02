/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ title: NonNullable<unknown>, n: NonNullable<unknown> }} Chat_Citation_NthInputs */



/**
* | output |
* | --- |
* | "{title} {n}" |
*
* @param {Chat_Citation_NthInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_citation_nth = /** @type {((inputs: Chat_Citation_NthInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Citation_NthInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.title} ${i?.n}`)
	return /** @type {LocalizedString} */ (`${i?.title} ${i?.n}`)
});