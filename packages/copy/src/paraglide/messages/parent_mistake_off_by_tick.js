/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Off_By_TickInputs */



/**
* | output |
* | --- |
* | "One mark away on the line" |
*
* @param {Parent_Mistake_Off_By_TickInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_off_by_tick = /** @type {((inputs?: Parent_Mistake_Off_By_TickInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Off_By_TickInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("One mark away on the line")
	return /** @type {LocalizedString} */ ("O jedną kreskę obok na osi")
});