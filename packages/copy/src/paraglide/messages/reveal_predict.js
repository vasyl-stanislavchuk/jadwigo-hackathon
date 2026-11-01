/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Reveal_PredictInputs */



/**
* | output |
* | --- |
* | "What do you think comes next?" |
*
* @param {Reveal_PredictInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const reveal_predict = /** @type {((inputs?: Reveal_PredictInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reveal_PredictInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("What do you think comes next?")
	return /** @type {LocalizedString} */ ("Jak myślisz, co będzie dalej?")
});