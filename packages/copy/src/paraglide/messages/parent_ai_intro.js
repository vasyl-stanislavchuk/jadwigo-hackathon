/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Ai_IntroInputs */



/**
* | output |
* | --- |
* | "Jadwigo AI makes a lesson from what you describe." |
*
* @param {Parent_Ai_IntroInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_ai_intro = /** @type {((inputs?: Parent_Ai_IntroInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Ai_IntroInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Jadwigo AI makes a lesson from what you describe.")
	return /** @type {LocalizedString} */ ("Jadwigo AI ułoży lekcję z Twojego opisu.")
});