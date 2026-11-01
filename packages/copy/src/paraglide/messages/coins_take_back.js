/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ value: NonNullable<unknown> }} Coins_Take_BackInputs */



/**
* | output |
* | --- |
* | "Take {value} back from the tray" |
*
* @param {Coins_Take_BackInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const coins_take_back = /** @type {((inputs: Coins_Take_BackInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Coins_Take_BackInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Take ${i?.value} back from the tray`)
	return /** @type {LocalizedString} */ (`Zabierz ${i?.value} z tacki`)
});