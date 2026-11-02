/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Collapse_AllInputs */



/**
* | output |
* | --- |
* | "Collapse all" |
*
* @param {Parent_Collapse_AllInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_collapse_all = /** @type {((inputs?: Parent_Collapse_AllInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Collapse_AllInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Collapse all")
	return /** @type {LocalizedString} */ ("Zwiń wszystkie")
});