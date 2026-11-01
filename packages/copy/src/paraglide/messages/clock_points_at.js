/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Clock_Points_AtInputs */



/**
* | output |
* | --- |
* | "points at {n}" |
*
* @param {Clock_Points_AtInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const clock_points_at = /** @type {((inputs: Clock_Points_AtInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Clock_Points_AtInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`points at ${i?.n}`)
	return /** @type {LocalizedString} */ (`wskazuje ${i?.n}`)
});