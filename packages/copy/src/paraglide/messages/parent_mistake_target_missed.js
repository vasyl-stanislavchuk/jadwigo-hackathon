/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Target_MissedInputs */



/**
* | output |
* | --- |
* | "Not everything asked for was marked" |
*
* @param {Parent_Mistake_Target_MissedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_target_missed = /** @type {((inputs?: Parent_Mistake_Target_MissedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Target_MissedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Not everything asked for was marked")
	return /** @type {LocalizedString} */ ("Nie wszystko, o co pytano, zostało zaznaczone")
});