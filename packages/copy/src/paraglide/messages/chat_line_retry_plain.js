/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Line_Retry_PlainInputs */



/**
* | output |
* | --- |
* | "That took too long, trying again" |
*
* @param {Chat_Line_Retry_PlainInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_retry_plain = /** @type {((inputs?: Chat_Line_Retry_PlainInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_Retry_PlainInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("That took too long, trying again")
	return /** @type {LocalizedString} */ ("Trwało to za długo, próbuję jeszcze raz")
});