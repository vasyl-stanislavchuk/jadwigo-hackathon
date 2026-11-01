/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Report_Next_FocusInputs */



/**
* | output |
* | --- |
* | "What to focus on next" |
*
* @param {Parent_Report_Next_FocusInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_report_next_focus = /** @type {((inputs?: Parent_Report_Next_FocusInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Report_Next_FocusInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("What to focus on next")
	return /** @type {LocalizedString} */ ("Na czym skupić się dalej")
});