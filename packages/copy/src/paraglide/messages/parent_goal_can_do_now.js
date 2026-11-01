/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Goal_Can_Do_NowInputs */



/**
* | output |
* | --- |
* | "Can do now" |
*
* @param {Parent_Goal_Can_Do_NowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_goal_can_do_now = /** @type {((inputs?: Parent_Goal_Can_Do_NowInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Goal_Can_Do_NowInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Can do now")
	return /** @type {LocalizedString} */ ("Umie już")
});