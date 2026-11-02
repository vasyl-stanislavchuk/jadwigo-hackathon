/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Ideas_Why_Review_DueInputs */



/**
* | output |
* | --- |
* | "Due for review" |
*
* @param {Chat_Ideas_Why_Review_DueInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_why_review_due = /** @type {((inputs?: Chat_Ideas_Why_Review_DueInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Ideas_Why_Review_DueInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Due for review")
	return /** @type {LocalizedString} */ ("Pora na powtórkę")
});