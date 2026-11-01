/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Parent_Review_AskedInputs */



/**
* | output |
* | --- |
* | "Questions asked: {n}" |
*
* @param {Parent_Review_AskedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_review_asked = /** @type {((inputs: Parent_Review_AskedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Review_AskedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Questions asked: ${i?.n}`)
	return /** @type {LocalizedString} */ (`Zadane pytania: ${i?.n}`)
});