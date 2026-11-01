/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Half_Past_Wrong_HourInputs */



/**
* | output |
* | --- |
* | "Half past, with the hour next to it" |
*
* @param {Parent_Mistake_Half_Past_Wrong_HourInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_half_past_wrong_hour = /** @type {((inputs?: Parent_Mistake_Half_Past_Wrong_HourInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Half_Past_Wrong_HourInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Half past, with the hour next to it")
	return /** @type {LocalizedString} */ ("Wpół do, ale z sąsiednią godziną")
});