/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Neighbour_Fact_SwapInputs */



/**
* | output |
* | --- |
* | "The result of a nearby times-table fact" |
*
* @param {Parent_Mistake_Neighbour_Fact_SwapInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_neighbour_fact_swap = /** @type {((inputs?: Parent_Mistake_Neighbour_Fact_SwapInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Neighbour_Fact_SwapInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The result of a nearby times-table fact")
	return /** @type {LocalizedString} */ ("Wynik innego, bliskiego działania z tabliczki")
});