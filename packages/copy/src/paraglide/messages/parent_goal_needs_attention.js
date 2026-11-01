/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Goal_Needs_AttentionInputs */



/**
* | output |
* | --- |
* | "Working on" |
*
* @param {Parent_Goal_Needs_AttentionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_goal_needs_attention = /** @type {((inputs?: Parent_Goal_Needs_AttentionInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Goal_Needs_AttentionInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Working on")
	return /** @type {LocalizedString} */ ("Nad czym pracujemy")
});