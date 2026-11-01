/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Not_An_ExpressionInputs */



/**
* | output |
* | --- |
* | "An equation where an expression was asked" |
*
* @param {Parent_Mistake_Not_An_ExpressionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_not_an_expression = /** @type {((inputs?: Parent_Mistake_Not_An_ExpressionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Not_An_ExpressionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("An equation where an expression was asked")
	return /** @type {LocalizedString} */ ("Równanie zamiast wyrażenia")
});