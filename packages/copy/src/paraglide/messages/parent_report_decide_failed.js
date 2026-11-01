/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Report_Decide_FailedInputs */



/**
* | output |
* | --- |
* | "That didn't save. Try again." |
*
* @param {Parent_Report_Decide_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_report_decide_failed = /** @type {((inputs?: Parent_Report_Decide_FailedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Report_Decide_FailedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("That didn't save. Try again.")
	return /** @type {LocalizedString} */ ("Nie udało się zapisać. Spróbuj ponownie.")
});