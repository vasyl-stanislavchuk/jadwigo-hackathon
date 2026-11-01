/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ds_Compare_SolutionInputs */



/**
* | output |
* | --- |
* | "Compare it with your answer." |
*
* @param {Ds_Compare_SolutionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_compare_solution = /** @type {((inputs?: Ds_Compare_SolutionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_Compare_SolutionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Compare it with your answer.")
	return /** @type {LocalizedString} */ ("Porównaj je ze swoją odpowiedzią.")
});