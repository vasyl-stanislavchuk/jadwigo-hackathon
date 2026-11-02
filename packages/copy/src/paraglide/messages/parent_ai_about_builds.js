/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Ai_About_BuildsInputs */



/**
* | output |
* | --- |
* | "Builds the lesson and checks it." |
*
* @param {Parent_Ai_About_BuildsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_ai_about_builds = /** @type {((inputs?: Parent_Ai_About_BuildsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Ai_About_BuildsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Builds the lesson and checks it.")
	return /** @type {LocalizedString} */ ("Układa i sprawdza lekcję.")
});