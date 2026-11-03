/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, next: NonNullable<unknown> }} Card_WorkingInputs */



/**
* | output |
* | --- |
* | "Version {n} · Jadwigo is making version {next}" |
*
* @param {Card_WorkingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_working = /** @type {((inputs: Card_WorkingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Card_WorkingInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Version ${i?.n} · Jadwigo is making version ${i?.next}`)
	return /** @type {LocalizedString} */ (`Wersja ${i?.n} · Jadwigo robi wersję ${i?.next}`)
});