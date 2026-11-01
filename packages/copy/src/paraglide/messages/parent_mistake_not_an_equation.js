/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Not_An_EquationInputs */



/**
* | output |
* | --- |
* | "An expression where an equation was asked" |
*
* @param {Parent_Mistake_Not_An_EquationInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_not_an_equation = /** @type {((inputs?: Parent_Mistake_Not_An_EquationInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Not_An_EquationInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("An expression where an equation was asked")
	return /** @type {LocalizedString} */ ("Wyrażenie zamiast równania")
});