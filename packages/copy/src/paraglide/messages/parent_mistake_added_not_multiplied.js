/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Added_Not_MultipliedInputs */



/**
* | output |
* | --- |
* | "Added instead of multiplying" |
*
* @param {Parent_Mistake_Added_Not_MultipliedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_added_not_multiplied = /** @type {((inputs?: Parent_Mistake_Added_Not_MultipliedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Added_Not_MultipliedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Added instead of multiplying")
	return /** @type {LocalizedString} */ ("Dodawanie zamiast mnożenia")
});