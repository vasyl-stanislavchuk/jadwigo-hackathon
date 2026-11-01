/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Number_For_ExpressionInputs */



/**
* | output |
* | --- |
* | "Just the result, not the expression" |
*
* @param {Parent_Mistake_Number_For_ExpressionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_number_for_expression = /** @type {((inputs?: Parent_Mistake_Number_For_ExpressionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Number_For_ExpressionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Just the result, not the expression")
	return /** @type {LocalizedString} */ ("Sam wynik zamiast działania")
});