/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Chat_Finding_Skill_IdInputs */



/**
* | output |
* | --- |
* | "A skill has a name the lesson doesn't recognise." |
*
* @param {Chat_Finding_Skill_IdInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_skill_id = /** @type {((inputs?: Chat_Finding_Skill_IdInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Finding_Skill_IdInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A skill has a name the lesson doesn't recognise.")
	return /** @type {LocalizedString} */ ("Umiejętność ma nazwę, której lekcja nie rozpoznaje.")
});