/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Report_Skills_StandingInputs */



/**
* | output |
* | --- |
* | "Where the skills stand" |
*
* @param {Parent_Report_Skills_StandingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_report_skills_standing = /** @type {((inputs?: Parent_Report_Skills_StandingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Report_Skills_StandingInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Where the skills stand")
	return /** @type {LocalizedString} */ ("Gdzie jest z umiejętnościami")
});