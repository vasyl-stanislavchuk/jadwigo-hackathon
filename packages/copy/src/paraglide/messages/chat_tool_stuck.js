/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ message: NonNullable<unknown> }} Chat_Tool_StuckInputs */



/**
* | output |
* | --- |
* | "didn't work: {message}" |
*
* @param {Chat_Tool_StuckInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_stuck = /** @type {((inputs: Chat_Tool_StuckInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_StuckInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`didn't work: ${i?.message}`)
	return /** @type {LocalizedString} */ (`nie udało się: ${i?.message}`)
});