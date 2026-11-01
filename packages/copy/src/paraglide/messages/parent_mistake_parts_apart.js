/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Parts_ApartInputs */



/**
* | output |
* | --- |
* | "The shaded parts not side by side" |
*
* @param {Parent_Mistake_Parts_ApartInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_parts_apart = /** @type {((inputs?: Parent_Mistake_Parts_ApartInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Parts_ApartInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The shaded parts not side by side")
	return /** @type {LocalizedString} */ ("Zamalowane części nie leżą obok siebie")
});