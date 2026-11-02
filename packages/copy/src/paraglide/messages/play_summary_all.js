/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Play_Summary_AllInputs */



/**
* | output |
* | --- |
* | "All done! Have a look at your answers." |
*
* @param {Play_Summary_AllInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_summary_all = /** @type {((inputs?: Play_Summary_AllInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Summary_AllInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("All done! Have a look at your answers.")
	return /** @type {LocalizedString} */ ("Wszystkie pytania gotowe! Zobacz swoje odpowiedzi.")
});