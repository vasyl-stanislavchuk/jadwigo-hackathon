/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Outcome_Got_ThereInputs */



/**
* | output |
* | --- |
* | "After tries or help" |
*
* @param {Parent_Outcome_Got_ThereInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_outcome_got_there = /** @type {((inputs?: Parent_Outcome_Got_ThereInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Outcome_Got_ThereInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("After tries or help")
	return /** @type {LocalizedString} */ ("Po próbach lub z pomocą")
});