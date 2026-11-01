/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_One_Pack_OnlyInputs */



/**
* | output |
* | --- |
* | "Only one pack counted" |
*
* @param {Parent_Mistake_One_Pack_OnlyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_one_pack_only = /** @type {((inputs?: Parent_Mistake_One_Pack_OnlyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_One_Pack_OnlyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Only one pack counted")
	return /** @type {LocalizedString} */ ("Policzone tylko jedno opakowanie")
});