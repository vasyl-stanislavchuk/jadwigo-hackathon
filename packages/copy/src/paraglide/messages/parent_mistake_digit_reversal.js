/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Digit_ReversalInputs */



/**
* | output |
* | --- |
* | "The digits the other way around" |
*
* @param {Parent_Mistake_Digit_ReversalInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_digit_reversal = /** @type {((inputs?: Parent_Mistake_Digit_ReversalInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Digit_ReversalInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The digits the other way around")
	return /** @type {LocalizedString} */ ("Cyfry w odwrotnej kolejności")
});