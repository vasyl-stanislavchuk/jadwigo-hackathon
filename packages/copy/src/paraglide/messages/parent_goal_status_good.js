/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Goal_Status_GoodInputs */



/**
* | output |
* | --- |
* | "Going well" |
*
* @param {Parent_Goal_Status_GoodInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_goal_status_good = /** @type {((inputs?: Parent_Goal_Status_GoodInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Goal_Status_GoodInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Going well")
	return /** @type {LocalizedString} */ ("Idzie dobrze")
});