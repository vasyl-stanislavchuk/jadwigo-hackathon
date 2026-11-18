/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Language_IntroInputs */



/**
* | output |
* | --- |
* | "The parent pages show in this language." |
*
* @param {Parent_Language_IntroInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_language_intro = /** @type {((inputs?: Parent_Language_IntroInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Language_IntroInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The parent pages show in this language.")
	return /** @type {LocalizedString} */ ("W tym języku widzisz strony rodzica.")
});