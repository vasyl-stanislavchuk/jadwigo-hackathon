/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Ai_About_SearchesInputs */



/**
* | output |
* | --- |
* | "Searches the question bank." |
*
* @param {Parent_Ai_About_SearchesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_ai_about_searches = /** @type {((inputs?: Parent_Ai_About_SearchesInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Ai_About_SearchesInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Searches the question bank.")
	return /** @type {LocalizedString} */ ("Szuka w banku zadań.")
});