/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Wrong_DirectionInputs */



/**
* | output |
* | --- |
* | "Counted from the other end of the line" |
*
* @param {Parent_Mistake_Wrong_DirectionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_wrong_direction = /** @type {((inputs?: Parent_Mistake_Wrong_DirectionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Wrong_DirectionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Counted from the other end of the line")
	return /** @type {LocalizedString} */ ("Liczenie od drugiego końca osi")
});