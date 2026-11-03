/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ from: NonNullable<unknown>, to: NonNullable<unknown> }} Parent_Grade_AgeInputs */



/**
* | output |
* | --- |
* | "ages {from}–{to}" |
*
* @param {Parent_Grade_AgeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_grade_age = /** @type {((inputs: Parent_Grade_AgeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Grade_AgeInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`ages ${i?.from}–${i?.to}`)
	return /** @type {LocalizedString} */ (`${i?.from}–${i?.to} lat`)
});