/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Carry_Not_AddedInputs */



/**
* | output |
* | --- |
* | "The carried number not added" |
*
* @param {Parent_Mistake_Carry_Not_AddedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_carry_not_added = /** @type {((inputs?: Parent_Mistake_Carry_Not_AddedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Carry_Not_AddedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The carried number not added")
	return /** @type {LocalizedString} */ ("Niedodane przeniesienie")
});