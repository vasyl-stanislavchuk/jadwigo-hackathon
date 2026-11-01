/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Play_Results_HelpInputs */



/**
* | output |
* | --- |
* | "Help: {n}" |
*
* @param {Play_Results_HelpInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_results_help = /** @type {((inputs: Play_Results_HelpInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Results_HelpInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Help: ${i?.n}`)
	return /** @type {LocalizedString} */ (`Pomoc: ${i?.n}`)
});