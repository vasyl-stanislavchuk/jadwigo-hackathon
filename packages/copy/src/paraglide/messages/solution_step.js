/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, total: NonNullable<unknown> }} Solution_StepInputs */



/**
* | output |
* | --- |
* | "Step {n} of {total}" |
*
* @param {Solution_StepInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const solution_step = /** @type {((inputs: Solution_StepInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Solution_StepInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Step ${i?.n} of ${i?.total}`)
	return /** @type {LocalizedString} */ (`Krok ${i?.n} z ${i?.total}`)
});