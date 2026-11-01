/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Added_Not_SubtractedInputs */



/**
* | output |
* | --- |
* | "Added instead of subtracting" |
*
* @param {Parent_Mistake_Added_Not_SubtractedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_added_not_subtracted = /** @type {((inputs?: Parent_Mistake_Added_Not_SubtractedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Added_Not_SubtractedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Added instead of subtracting")
	return /** @type {LocalizedString} */ ("Dodawanie zamiast odejmowania")
});