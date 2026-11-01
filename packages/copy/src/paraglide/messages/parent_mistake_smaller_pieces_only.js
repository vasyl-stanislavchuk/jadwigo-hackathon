/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Smaller_Pieces_OnlyInputs */



/**
* | output |
* | --- |
* | "Only the smaller pieces looked at" |
*
* @param {Parent_Mistake_Smaller_Pieces_OnlyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_smaller_pieces_only = /** @type {((inputs?: Parent_Mistake_Smaller_Pieces_OnlyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Smaller_Pieces_OnlyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Only the smaller pieces looked at")
	return /** @type {LocalizedString} */ ("Patrzenie tylko na mniejsze kawałki")
});