/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Split_After_ColInputs */



/**
* | output |
* | --- |
* | "Split after column {n}" |
*
* @param {Split_After_ColInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const split_after_col = /** @type {((inputs: Split_After_ColInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Split_After_ColInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Split after column ${i?.n}`)
	return /** @type {LocalizedString} */ (`Podziel za kolumną ${i?.n}`)
});