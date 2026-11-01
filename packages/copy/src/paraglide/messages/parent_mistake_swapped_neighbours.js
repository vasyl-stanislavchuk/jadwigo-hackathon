/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Swapped_NeighboursInputs */



/**
* | output |
* | --- |
* | "A swap of 2 items next to each other" |
*
* @param {Parent_Mistake_Swapped_NeighboursInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_swapped_neighbours = /** @type {((inputs?: Parent_Mistake_Swapped_NeighboursInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Swapped_NeighboursInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A swap of 2 items next to each other")
	return /** @type {LocalizedString} */ ("Zamienione dwa sąsiednie elementy")
});