/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Forgot_Second_StepInputs */



/**
* | output |
* | --- |
* | "The second step left out" |
*
* @param {Parent_Mistake_Forgot_Second_StepInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_forgot_second_step = /** @type {((inputs?: Parent_Mistake_Forgot_Second_StepInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Forgot_Second_StepInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The second step left out")
	return /** @type {LocalizedString} */ ("Pominięty drugi krok")
});