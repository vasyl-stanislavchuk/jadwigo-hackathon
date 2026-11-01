/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Tab_SkillsInputs */



/**
* | output |
* | --- |
* | "Skills" |
*
* @param {Parent_Tab_SkillsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_tab_skills = /** @type {((inputs?: Parent_Tab_SkillsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Tab_SkillsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Skills")
	return /** @type {LocalizedString} */ ("Umiejętności")
});