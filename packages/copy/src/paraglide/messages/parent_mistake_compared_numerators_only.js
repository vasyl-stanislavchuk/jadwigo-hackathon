/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Compared_Numerators_OnlyInputs */



/**
* | output |
* | --- |
* | "Only the numerators compared" |
*
* @param {Parent_Mistake_Compared_Numerators_OnlyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_compared_numerators_only = /** @type {((inputs?: Parent_Mistake_Compared_Numerators_OnlyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Compared_Numerators_OnlyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Only the numerators compared")
	return /** @type {LocalizedString} */ ("Porównane tylko liczniki")
});