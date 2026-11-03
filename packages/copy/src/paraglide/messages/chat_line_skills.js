/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Line_SkillsInputs */



/**
* | output |
* | --- |
* | "Looked at the skills" |
*
* @param {Chat_Line_SkillsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_skills = /** @type {((inputs?: Chat_Line_SkillsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_SkillsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Looked at the skills")
	return /** @type {LocalizedString} */ ("Przejrzałam umiejętności")
});