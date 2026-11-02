/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Mistakes_NoneInputs */



/**
* | output |
* | --- |
* | "Nothing was hard lately." |
*
* @param {Chat_Mistakes_NoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_mistakes_none = /** @type {((inputs?: Chat_Mistakes_NoneInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Mistakes_NoneInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Nothing was hard lately.")
	return /** @type {LocalizedString} */ ("Ostatnio nic nie sprawiało trudności.")
});