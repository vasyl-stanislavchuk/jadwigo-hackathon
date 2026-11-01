/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Report_Not_WrittenInputs */



/**
* | output |
* | --- |
* | "The report's numbers are in, but it is not written up yet." |
*
* @param {Parent_Report_Not_WrittenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_report_not_written = /** @type {((inputs?: Parent_Report_Not_WrittenInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Report_Not_WrittenInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The report's numbers are in, but it is not written up yet.")
	return /** @type {LocalizedString} */ ("Raport jest policzony, ale jeszcze nie opisany.")
});