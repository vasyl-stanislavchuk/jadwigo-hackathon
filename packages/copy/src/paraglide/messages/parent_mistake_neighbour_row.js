/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Neighbour_RowInputs */



/**
* | output |
* | --- |
* | "A result from the next row of the times table" |
*
* @param {Parent_Mistake_Neighbour_RowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_neighbour_row = /** @type {((inputs?: Parent_Mistake_Neighbour_RowInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Neighbour_RowInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A result from the next row of the times table")
	return /** @type {LocalizedString} */ ("Wynik z sąsiedniego rzędu tabliczki")
});