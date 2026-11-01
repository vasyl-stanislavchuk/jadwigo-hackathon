/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ source: NonNullable<unknown> }} Credit_SourceInputs */



/**
* | output |
* | --- |
* | "Source: {source}" |
*
* @param {Credit_SourceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_source = /** @type {((inputs: Credit_SourceInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Credit_SourceInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Source: ${i?.source}`)
	return /** @type {LocalizedString} */ (`Źródło: ${i?.source}`)
});