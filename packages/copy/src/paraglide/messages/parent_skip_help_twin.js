/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Skip_Help_TwinInputs */



/**
* | output |
* | --- |
* | "After help: a similar question" |
*
* @param {Parent_Skip_Help_TwinInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_skip_help_twin = /** @type {((inputs?: Parent_Skip_Help_TwinInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Skip_Help_TwinInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("After help: a similar question")
	return /** @type {LocalizedString} */ ("Po pomocy: podobne pytanie")
});