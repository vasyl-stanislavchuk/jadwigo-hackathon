/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Child_Skills_EmptyInputs */



/**
* | output |
* | --- |
* | "The child's goals will appear here: what they can do, what you are working on and what comes next." |
*
* @param {Parent_Child_Skills_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_child_skills_empty = /** @type {((inputs?: Parent_Child_Skills_EmptyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Child_Skills_EmptyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The child's goals will appear here: what they can do, what you are working on and what comes next.")
	return /** @type {LocalizedString} */ ("Tu pojawią się cele dziecka: co już umie, nad czym pracujecie i co dalej.")
});