/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Missed_RegionInputs */



/**
* | output |
* | --- |
* | "Another place marked on the picture" |
*
* @param {Parent_Mistake_Missed_RegionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_missed_region = /** @type {((inputs?: Parent_Mistake_Missed_RegionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Missed_RegionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Another place marked on the picture")
	return /** @type {LocalizedString} */ ("Zaznaczone inne miejsce na obrazku")
});