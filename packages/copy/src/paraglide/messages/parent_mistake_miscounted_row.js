/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Miscounted_RowInputs */



/**
* | output |
* | --- |
* | "A row counted differently" |
*
* @param {Parent_Mistake_Miscounted_RowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_miscounted_row = /** @type {((inputs?: Parent_Mistake_Miscounted_RowInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Miscounted_RowInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A row counted differently")
	return /** @type {LocalizedString} */ ("Inaczej policzony rząd")
});