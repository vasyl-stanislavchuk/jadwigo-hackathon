/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ stage: NonNullable<unknown> }} Chat_Line_RetryInputs */



/**
* | output |
* | --- |
* | "{stage} took too long, trying again" |
*
* @param {Chat_Line_RetryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_retry = /** @type {((inputs: Chat_Line_RetryInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_RetryInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.stage} took too long, trying again`)
	return /** @type {LocalizedString} */ (`${i?.stage} trwało za długo, próbuję jeszcze raz`)
});