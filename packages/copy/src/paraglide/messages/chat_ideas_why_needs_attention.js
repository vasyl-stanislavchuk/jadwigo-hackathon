/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Ideas_Why_Needs_AttentionInputs */



/**
* | output |
* | --- |
* | "Was hard lately" |
*
* @param {Chat_Ideas_Why_Needs_AttentionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_why_needs_attention = /** @type {((inputs?: Chat_Ideas_Why_Needs_AttentionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Ideas_Why_Needs_AttentionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Was hard lately")
	return /** @type {LocalizedString} */ ("Ostatnio sprawiało trudność")
});