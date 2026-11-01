/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Learner_Nothing_RecordedInputs */



/**
* | output |
* | --- |
* | "Nothing recorded yet." |
*
* @param {Parent_Learner_Nothing_RecordedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_learner_nothing_recorded = /** @type {((inputs?: Parent_Learner_Nothing_RecordedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Learner_Nothing_RecordedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Nothing recorded yet.")
	return /** @type {LocalizedString} */ ("Nic jeszcze nie zapisano.")
});