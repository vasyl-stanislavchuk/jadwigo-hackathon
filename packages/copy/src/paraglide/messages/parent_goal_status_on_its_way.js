/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Goal_Status_On_Its_WayInputs */



/**
* | output |
* | --- |
* | "On its way" |
*
* @param {Parent_Goal_Status_On_Its_WayInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_goal_status_on_its_way = /** @type {((inputs?: Parent_Goal_Status_On_Its_WayInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Goal_Status_On_Its_WayInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("On its way")
	return /** @type {LocalizedString} */ ("W drodze")
});