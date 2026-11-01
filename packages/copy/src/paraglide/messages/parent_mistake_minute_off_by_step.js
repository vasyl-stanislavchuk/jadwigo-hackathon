/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Minute_Off_By_StepInputs */



/**
* | output |
* | --- |
* | "The minute hand one mark away" |
*
* @param {Parent_Mistake_Minute_Off_By_StepInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_minute_off_by_step = /** @type {((inputs?: Parent_Mistake_Minute_Off_By_StepInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Minute_Off_By_StepInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The minute hand one mark away")
	return /** @type {LocalizedString} */ ("Wskazówka minutowa o jedną kreskę obok")
});