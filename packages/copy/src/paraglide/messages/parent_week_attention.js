/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Parent_Week_AttentionInputs */



/**
* | output |
* | --- |
* | "Need attention: {n}" |
*
* @param {Parent_Week_AttentionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_week_attention = /** @type {((inputs: Parent_Week_AttentionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Week_AttentionInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Need attention: ${i?.n}`)
	return /** @type {LocalizedString} */ (`Do uwagi: ${i?.n}`)
});