/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Parent_Overview_TriesInputs */



/**
* | output |
* | --- |
* | "Tries: {n}" |
*
* @param {Parent_Overview_TriesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_overview_tries = /** @type {((inputs: Parent_Overview_TriesInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Overview_TriesInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Tries: ${i?.n}`)
	return /** @type {LocalizedString} */ (`Próby: ${i?.n}`)
});