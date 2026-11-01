/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ from: NonNullable<unknown>, to: NonNullable<unknown> }} Clock_Points_BetweenInputs */



/**
* | output |
* | --- |
* | "between {from} and {to}" |
*
* @param {Clock_Points_BetweenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const clock_points_between = /** @type {((inputs: Clock_Points_BetweenInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Clock_Points_BetweenInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`between ${i?.from} and ${i?.to}`)
	return /** @type {LocalizedString} */ (`między ${i?.from} a ${i?.to}`)
});