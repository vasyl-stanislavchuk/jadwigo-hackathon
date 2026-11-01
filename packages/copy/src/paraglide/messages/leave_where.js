/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ where: NonNullable<unknown> }} Leave_WhereInputs */



/**
* | output |
* | --- |
* | "{where} opens in a new tab" |
*
* @param {Leave_WhereInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const leave_where = /** @type {((inputs: Leave_WhereInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Leave_WhereInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.where} opens in a new tab`)
	return /** @type {LocalizedString} */ (`Otworzy się ${i?.where} w nowej karcie`)
});