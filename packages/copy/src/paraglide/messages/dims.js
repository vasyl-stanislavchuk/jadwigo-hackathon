/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ rows: NonNullable<unknown>, cols: NonNullable<unknown> }} DimsInputs */



/**
* | output |
* | --- |
* | "{rows} by {cols}" |
*
* @param {DimsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const dims = /** @type {((inputs: DimsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<DimsInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.rows} by ${i?.cols}`)
	return /** @type {LocalizedString} */ (`${i?.rows} na ${i?.cols}`)
});