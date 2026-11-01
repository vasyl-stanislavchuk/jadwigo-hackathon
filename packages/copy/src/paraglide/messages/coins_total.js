/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ amount: NonNullable<unknown> }} Coins_TotalInputs */



/**
* | output |
* | --- |
* | "In the tray: {amount}" |
*
* @param {Coins_TotalInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const coins_total = /** @type {((inputs: Coins_TotalInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Coins_TotalInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`In the tray: ${i?.amount}`)
	return /** @type {LocalizedString} */ (`Na tacce jest ${i?.amount}`)
});