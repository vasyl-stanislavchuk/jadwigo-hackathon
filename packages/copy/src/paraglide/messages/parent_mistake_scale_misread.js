/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Scale_MisreadInputs */



/**
* | output |
* | --- |
* | "The scale's steps read differently" |
*
* @param {Parent_Mistake_Scale_MisreadInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_scale_misread = /** @type {((inputs?: Parent_Mistake_Scale_MisreadInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Scale_MisreadInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The scale's steps read differently")
	return /** @type {LocalizedString} */ ("Inaczej odczytana podziałka")
});