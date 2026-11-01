/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ value: NonNullable<unknown> }} Coins_AddInputs */



/**
* | output |
* | --- |
* | "Put {value} in the tray" |
*
* @param {Coins_AddInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const coins_add = /** @type {((inputs: Coins_AddInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Coins_AddInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Put ${i?.value} in the tray`)
	return /** @type {LocalizedString} */ (`Połóż ${i?.value} na tacce`)
});