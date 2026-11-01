/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, of: NonNullable<unknown> }} Ds_Hint_OfInputs */



/**
* | output |
* | --- |
* | "{n} of {of}" |
*
* @param {Ds_Hint_OfInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_hint_of = /** @type {((inputs: Ds_Hint_OfInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_Hint_OfInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.n} of ${i?.of}`)
	return /** @type {LocalizedString} */ (`${i?.n} z ${i?.of}`)
});