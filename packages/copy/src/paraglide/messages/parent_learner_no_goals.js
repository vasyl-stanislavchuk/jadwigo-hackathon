/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Learner_No_GoalsInputs */



/**
* | output |
* | --- |
* | "No goals yet." |
*
* @param {Parent_Learner_No_GoalsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_learner_no_goals = /** @type {((inputs?: Parent_Learner_No_GoalsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Learner_No_GoalsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("No goals yet.")
	return /** @type {LocalizedString} */ ("Nie ma jeszcze żadnego celu.")
});