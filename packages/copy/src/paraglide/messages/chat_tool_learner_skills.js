/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Tool_Learner_SkillsInputs */



/**
* | output |
* | --- |
* | "Reading the learner's goals" |
*
* @param {Chat_Tool_Learner_SkillsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_learner_skills = /** @type {((inputs?: Chat_Tool_Learner_SkillsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Learner_SkillsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Reading the learner's goals")
	return /** @type {LocalizedString} */ ("Czytam cele dziecka")
});