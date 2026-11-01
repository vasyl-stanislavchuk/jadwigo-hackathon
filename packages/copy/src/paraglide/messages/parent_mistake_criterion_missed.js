/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Criterion_MissedInputs */



/**
* | output |
* | --- |
* | "One of the conditions left out" |
*
* @param {Parent_Mistake_Criterion_MissedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_criterion_missed = /** @type {((inputs?: Parent_Mistake_Criterion_MissedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Criterion_MissedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("One of the conditions left out")
	return /** @type {LocalizedString} */ ("Pominięty jeden z warunków")
});