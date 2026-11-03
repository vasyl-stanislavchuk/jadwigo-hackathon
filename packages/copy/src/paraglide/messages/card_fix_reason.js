/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Card_Fix_ReasonInputs */



/**
* | output |
* | --- |
* | "You can give the lesson once the questions are fixed." |
*
* @param {Card_Fix_ReasonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_fix_reason = /** @type {((inputs?: Card_Fix_ReasonInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Card_Fix_ReasonInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("You can give the lesson once the questions are fixed.")
	return /** @type {LocalizedString} */ ("Daj lekcję będzie można, gdy zadania będą poprawione.")
});