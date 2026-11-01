/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Bar_WrongInputs */



/**
* | output |
* | --- |
* | "A bar of another height" |
*
* @param {Parent_Mistake_Bar_WrongInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_bar_wrong = /** @type {((inputs?: Parent_Mistake_Bar_WrongInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Bar_WrongInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A bar of another height")
	return /** @type {LocalizedString} */ ("Słupek innej wysokości")
});