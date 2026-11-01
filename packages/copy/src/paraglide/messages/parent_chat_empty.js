/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Chat_EmptyInputs */



/**
* | output |
* | --- |
* | "Your chat with Jadwigo will appear here." |
*
* @param {Parent_Chat_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_chat_empty = /** @type {((inputs?: Parent_Chat_EmptyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Chat_EmptyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Your chat with Jadwigo will appear here.")
	return /** @type {LocalizedString} */ ("Tu pojawi się rozmowa z Jadwigo.")
});