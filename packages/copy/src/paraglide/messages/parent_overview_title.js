/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Overview_TitleInputs */



/**
* | output |
* | --- |
* | "The lesson, question by question" |
*
* @param {Parent_Overview_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_overview_title = /** @type {((inputs?: Parent_Overview_TitleInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Overview_TitleInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The lesson, question by question")
	return /** @type {LocalizedString} */ ("Lekcja pytanie po pytaniu")
});