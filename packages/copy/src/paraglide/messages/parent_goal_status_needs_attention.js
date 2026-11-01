/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Goal_Status_Needs_AttentionInputs */



/**
* | output |
* | --- |
* | "Needs attention" |
*
* @param {Parent_Goal_Status_Needs_AttentionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_goal_status_needs_attention = /** @type {((inputs?: Parent_Goal_Status_Needs_AttentionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Goal_Status_Needs_AttentionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Needs attention")
	return /** @type {LocalizedString} */ ("Potrzebuje uwagi")
});