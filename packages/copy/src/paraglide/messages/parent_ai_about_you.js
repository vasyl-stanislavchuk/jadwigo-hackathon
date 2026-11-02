/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Ai_About_YouInputs */



/**
* | output |
* | --- |
* | "You decide what reaches the child." |
*
* @param {Parent_Ai_About_YouInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_ai_about_you = /** @type {((inputs?: Parent_Ai_About_YouInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Ai_About_YouInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("You decide what reaches the child.")
	return /** @type {LocalizedString} */ ("Ty decydujesz, co trafi do dziecka.")
});