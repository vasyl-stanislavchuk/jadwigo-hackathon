/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ds_Pause_TextInputs */



/**
* | output |
* | --- |
* | "The lesson will wait. You'll come back to the same question." |
*
* @param {Ds_Pause_TextInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_pause_text = /** @type {((inputs?: Ds_Pause_TextInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_Pause_TextInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The lesson will wait. You'll come back to the same question.")
	return /** @type {LocalizedString} */ ("Lekcja poczeka. Wrócisz do tego samego pytania.")
});