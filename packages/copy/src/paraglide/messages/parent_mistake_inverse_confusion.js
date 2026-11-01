/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Inverse_ConfusionInputs */



/**
* | output |
* | --- |
* | "The opposite operation to the one needed" |
*
* @param {Parent_Mistake_Inverse_ConfusionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_inverse_confusion = /** @type {((inputs?: Parent_Mistake_Inverse_ConfusionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Inverse_ConfusionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The opposite operation to the one needed")
	return /** @type {LocalizedString} */ ("Działanie odwrotne do potrzebnego")
});