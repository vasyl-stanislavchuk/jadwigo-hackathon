/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Card_Unchecked_PlainInputs */



/**
* | output |
* | --- |
* | "Nobody has checked this lesson yet." |
*
* @param {Card_Unchecked_PlainInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_unchecked_plain = /** @type {((inputs?: Card_Unchecked_PlainInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Card_Unchecked_PlainInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Nobody has checked this lesson yet.")
	return /** @type {LocalizedString} */ ("Tej lekcji nikt jeszcze nie sprawdził.")
});