/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Reveal_Have_IdeaInputs */



/**
* | output |
* | --- |
* | "I have an idea!" |
*
* @param {Reveal_Have_IdeaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const reveal_have_idea = /** @type {((inputs?: Reveal_Have_IdeaInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reveal_Have_IdeaInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("I have an idea!")
	return /** @type {LocalizedString} */ ("Mam pomysł!")
});