/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ question: NonNullable<unknown>, answer: NonNullable<unknown> }} Chat_Choose_RecapInputs */



/**
* | output |
* | --- |
* | "{question} · {answer}" |
*
* @param {Chat_Choose_RecapInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_choose_recap = /** @type {((inputs: Chat_Choose_RecapInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Choose_RecapInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.question} · ${i?.answer}`)
	return /** @type {LocalizedString} */ (`${i?.question} · ${i?.answer}`)
});