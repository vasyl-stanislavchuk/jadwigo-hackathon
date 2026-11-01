/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Equation_Sides_SwappedInputs */



/**
* | output |
* | --- |
* | "The equation's sides swapped" |
*
* @param {Parent_Mistake_Equation_Sides_SwappedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_equation_sides_swapped = /** @type {((inputs?: Parent_Mistake_Equation_Sides_SwappedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Equation_Sides_SwappedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The equation's sides swapped")
	return /** @type {LocalizedString} */ ("Zamienione strony równania")
});