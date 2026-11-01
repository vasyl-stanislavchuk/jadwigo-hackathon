/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Same_Parts_MissingInputs */



/**
* | output |
* | --- |
* | "The parts not equal" |
*
* @param {Parent_Mistake_Same_Parts_MissingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_same_parts_missing = /** @type {((inputs?: Parent_Mistake_Same_Parts_MissingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Same_Parts_MissingInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The parts not equal")
	return /** @type {LocalizedString} */ ("Części nie są równe")
});