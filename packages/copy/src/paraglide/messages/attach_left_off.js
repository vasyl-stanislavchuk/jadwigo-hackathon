/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ max: NonNullable<unknown>, n: NonNullable<unknown> }} Attach_Left_OffInputs */



/**
* | output |
* | --- |
* | "Only {max} files fit, {n} left off" |
*
* @param {Attach_Left_OffInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_left_off = /** @type {((inputs: Attach_Left_OffInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Attach_Left_OffInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Only ${i?.max} files fit, ${i?.n} left off`)
	return /** @type {LocalizedString} */ (`Zmieści się ${i?.max} plików, ${i?.n} pominięto`)
});