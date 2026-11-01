/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, m: NonNullable<unknown> }} Parent_Overview_RatioInputs */



/**
* | output |
* | --- |
* | "{n}/{m}" |
*
* @param {Parent_Overview_RatioInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_overview_ratio = /** @type {((inputs: Parent_Overview_RatioInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Overview_RatioInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.n}/${i?.m}`)
	return /** @type {LocalizedString} */ (`${i?.n}/${i?.m}`)
});