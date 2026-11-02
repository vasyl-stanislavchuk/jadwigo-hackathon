/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Ideas_Why_School_TagInputs */



/**
* | output |
* | --- |
* | "School is on this now" |
*
* @param {Chat_Ideas_Why_School_TagInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_why_school_tag = /** @type {((inputs?: Chat_Ideas_Why_School_TagInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Ideas_Why_School_TagInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("School is on this now")
	return /** @type {LocalizedString} */ ("Tego teraz uczą w szkole")
});