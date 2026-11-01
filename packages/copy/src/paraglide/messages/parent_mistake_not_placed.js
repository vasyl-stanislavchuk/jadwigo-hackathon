/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Not_PlacedInputs */



/**
* | output |
* | --- |
* | "Some pieces not placed yet" |
*
* @param {Parent_Mistake_Not_PlacedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_not_placed = /** @type {((inputs?: Parent_Mistake_Not_PlacedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Not_PlacedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Some pieces not placed yet")
	return /** @type {LocalizedString} */ ("Nie wszystko zostało ułożone")
});