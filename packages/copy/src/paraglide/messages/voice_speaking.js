/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Voice_SpeakingInputs */



/**
* | output |
* | --- |
* | "The voice is speaking…" |
*
* @param {Voice_SpeakingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const voice_speaking = /** @type {((inputs?: Voice_SpeakingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Voice_SpeakingInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The voice is speaking…")
	return /** @type {LocalizedString} */ ("Głos mówi…")
});