/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ tries: NonNullable<unknown>, help: NonNullable<unknown>, time: NonNullable<unknown> }} Parent_Overview_Sheet_LineInputs */



/**
* | output |
* | --- |
* | "{tries} · {help} · {time}" |
*
* @param {Parent_Overview_Sheet_LineInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_overview_sheet_line = /** @type {((inputs: Parent_Overview_Sheet_LineInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Overview_Sheet_LineInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.tries} · ${i?.help} · ${i?.time}`)
	return /** @type {LocalizedString} */ (`${i?.tries} · ${i?.help} · ${i?.time}`)
});