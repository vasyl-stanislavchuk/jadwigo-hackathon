/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Phase_Queued_LineInputs */



/**
* | output |
* | --- |
* | "Starting in a moment." |
*
* @param {Chat_Phase_Queued_LineInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_queued_line = /** @type {((inputs?: Chat_Phase_Queued_LineInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Phase_Queued_LineInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Starting in a moment.")
	return /** @type {LocalizedString} */ ("Zacznę za chwilę.")
});