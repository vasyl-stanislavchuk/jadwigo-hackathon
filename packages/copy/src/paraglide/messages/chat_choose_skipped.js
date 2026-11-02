/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ question: NonNullable<unknown> }} Chat_Choose_SkippedInputs */



/**
* | output |
* | --- |
* | "{question} · skipped" |
*
* @param {Chat_Choose_SkippedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_choose_skipped = /** @type {((inputs: Chat_Choose_SkippedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Choose_SkippedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.question} · skipped`)
	return /** @type {LocalizedString} */ (`${i?.question} · pominięte`)
});