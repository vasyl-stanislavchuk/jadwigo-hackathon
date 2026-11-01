/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Hour_Hand_Not_MovedInputs */



/**
* | output |
* | --- |
* | "The hour hand left on the full hour" |
*
* @param {Parent_Mistake_Hour_Hand_Not_MovedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_hour_hand_not_moved = /** @type {((inputs?: Parent_Mistake_Hour_Hand_Not_MovedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Hour_Hand_Not_MovedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The hour hand left on the full hour")
	return /** @type {LocalizedString} */ ("Wskazówka godzinowa została na pełnej godzinie")
});