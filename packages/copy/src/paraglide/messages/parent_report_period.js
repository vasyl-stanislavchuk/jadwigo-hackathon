/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ from: NonNullable<unknown>, to: NonNullable<unknown> }} Parent_Report_PeriodInputs */



/**
* | output |
* | --- |
* | "{from} to {to}" |
*
* @param {Parent_Report_PeriodInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_report_period = /** @type {((inputs: Parent_Report_PeriodInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Report_PeriodInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.from} to ${i?.to}`)
	return /** @type {LocalizedString} */ (`Od ${i?.from} do ${i?.to}`)
});