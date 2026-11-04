/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Card_Unchecked_ReasonInputs */



/**
* | output |
* | --- |
* | "Nobody has checked this lesson yet. “Fix it for me” will check and fix it." |
*
* @param {Card_Unchecked_ReasonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_unchecked_reason = /** @type {((inputs?: Card_Unchecked_ReasonInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Card_Unchecked_ReasonInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Nobody has checked this lesson yet. “Fix it for me” will check and fix it.")
	return /** @type {LocalizedString} */ ("Tej lekcji nikt jeszcze nie sprawdził. „Popraw za mnie” sprawdzi ją i poprawi.")
});