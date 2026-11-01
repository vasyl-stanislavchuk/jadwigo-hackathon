/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Week_No_ReportInputs */



/**
* | output |
* | --- |
* | "No report this week" |
*
* @param {Parent_Week_No_ReportInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_week_no_report = /** @type {((inputs?: Parent_Week_No_ReportInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Week_No_ReportInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("No report this week")
	return /** @type {LocalizedString} */ ("Bez raportu w tym tygodniu")
});