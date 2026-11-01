/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Parent_Overview_AttemptsInputs */



/**
* | output |
* | --- |
* | "Attempts: {n}" |
*
* @param {Parent_Overview_AttemptsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_overview_attempts = /** @type {((inputs: Parent_Overview_AttemptsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Overview_AttemptsInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Attempts: ${i?.n}`)
	return /** @type {LocalizedString} */ (`Podejścia: ${i?.n}`)
});