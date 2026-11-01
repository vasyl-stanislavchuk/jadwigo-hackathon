/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Connection_TroubleInputs */



/**
* | output |
* | --- |
* | "Just a moment, saving again…" |
*
* @param {Connection_TroubleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const connection_trouble = /** @type {((inputs?: Connection_TroubleInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Connection_TroubleInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Just a moment, saving again…")
	return /** @type {LocalizedString} */ ("Chwileczkę, zapisuję jeszcze raz…")
});