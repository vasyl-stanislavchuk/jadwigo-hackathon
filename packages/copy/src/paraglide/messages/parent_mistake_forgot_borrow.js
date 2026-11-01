/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Forgot_BorrowInputs */



/**
* | output |
* | --- |
* | "The borrow left out" |
*
* @param {Parent_Mistake_Forgot_BorrowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_forgot_borrow = /** @type {((inputs?: Parent_Mistake_Forgot_BorrowInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Forgot_BorrowInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The borrow left out")
	return /** @type {LocalizedString} */ ("Pominięte pożyczanie")
});