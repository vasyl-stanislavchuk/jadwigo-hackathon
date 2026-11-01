/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Confuses_ShapeInputs */



/**
* | output |
* | --- |
* | "One shape taken for another" |
*
* @param {Parent_Mistake_Confuses_ShapeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_confuses_shape = /** @type {((inputs?: Parent_Mistake_Confuses_ShapeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Confuses_ShapeInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("One shape taken for another")
	return /** @type {LocalizedString} */ ("Pomylone figury")
});