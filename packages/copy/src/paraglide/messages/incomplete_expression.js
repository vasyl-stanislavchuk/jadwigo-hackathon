/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Incomplete_ExpressionInputs */



/**
* | output |
* | --- |
* | "Finish the expression first." |
*
* @param {Incomplete_ExpressionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const incomplete_expression = /** @type {((inputs?: Incomplete_ExpressionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Incomplete_ExpressionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Finish the expression first.")
	return /** @type {LocalizedString} */ ("Dokończ działanie.")
});