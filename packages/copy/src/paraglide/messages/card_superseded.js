/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Card_SupersededInputs */



/**
* | output |
* | --- |
* | "version {n} · newer exists" |
*
* @param {Card_SupersededInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_superseded = /** @type {((inputs: Card_SupersededInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Card_SupersededInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`version ${i?.n} · newer exists`)
	return /** @type {LocalizedString} */ (`wersja ${i?.n} · jest nowsza`)
});