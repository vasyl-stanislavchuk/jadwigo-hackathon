/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Announce_Needs_YouInputs */



/**
* | output |
* | --- |
* | "Jadwigo AI: waiting for your answer" |
*
* @param {Chat_Announce_Needs_YouInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_announce_needs_you = /** @type {((inputs?: Chat_Announce_Needs_YouInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Announce_Needs_YouInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Jadwigo AI: waiting for your answer")
	return /** @type {LocalizedString} */ ("Jadwigo AI: czeka na Twoją odpowiedź")
});