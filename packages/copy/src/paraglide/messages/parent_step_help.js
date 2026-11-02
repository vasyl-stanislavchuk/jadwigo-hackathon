/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Parent_Step_HelpInputs */



/**
* | output |
* | --- |
* | "Help: {n}" |
*
* @param {Parent_Step_HelpInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_step_help = /** @type {((inputs: Parent_Step_HelpInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Step_HelpInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Help: ${i?.n}`)
	return /** @type {LocalizedString} */ (`Pomoc: ${i?.n}`)
});