/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Play_Summary_SomeInputs */



/**
* | output |
* | --- |
* | "Some of these we will practice again. See what the right answers look like." |
*
* @param {Play_Summary_SomeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_summary_some = /** @type {((inputs?: Play_Summary_SomeInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Summary_SomeInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Some of these we will practice again. See what the right answers look like.")
	return /** @type {LocalizedString} */ ("Niektóre pytania jeszcze poćwiczymy. Zobacz, jak wyglądają dobre odpowiedzi.")
});