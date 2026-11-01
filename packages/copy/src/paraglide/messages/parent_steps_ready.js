/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ done: NonNullable<unknown>, total: NonNullable<unknown> }} Parent_Steps_ReadyInputs */



/**
* | output |
* | --- |
* | "Steps ready: {done} of {total}" |
*
* @param {Parent_Steps_ReadyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_steps_ready = /** @type {((inputs: Parent_Steps_ReadyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Steps_ReadyInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Steps ready: ${i?.done} of ${i?.total}`)
	return /** @type {LocalizedString} */ (`Gotowe zadania: ${i?.done} z ${i?.total}`)
});