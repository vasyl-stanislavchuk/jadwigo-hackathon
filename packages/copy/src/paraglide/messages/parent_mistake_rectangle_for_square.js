/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Rectangle_For_SquareInputs */



/**
* | output |
* | --- |
* | "A rectangle where a square was asked" |
*
* @param {Parent_Mistake_Rectangle_For_SquareInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_rectangle_for_square = /** @type {((inputs?: Parent_Mistake_Rectangle_For_SquareInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Rectangle_For_SquareInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A rectangle where a square was asked")
	return /** @type {LocalizedString} */ ("Prostokąt zamiast kwadratu")
});