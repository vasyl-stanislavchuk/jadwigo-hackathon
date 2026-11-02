/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Step_Kind_SequenceInputs */



/**
* | output |
* | --- |
* | "Put in order" |
*
* @param {Parent_Step_Kind_SequenceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_step_kind_sequence = /** @type {((inputs?: Parent_Step_Kind_SequenceInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Step_Kind_SequenceInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Put in order")
	return /** @type {LocalizedString} */ ("Ułóż")
});