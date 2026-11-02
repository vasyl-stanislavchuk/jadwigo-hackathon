/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Ideas_SkillsInputs */



/**
* | count_noun | output |
* | --- | --- |
* | "one" | "{n} skill" |
* | "other" | "{n} skills" |
*
* @param {Chat_Ideas_SkillsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_skills = /** @type {((inputs: Chat_Ideas_SkillsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Ideas_SkillsInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const count_noun = registry.plural("en", i?.n, {}, true);
		if (count_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} skill`);
		if (count_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} skills`);
		return /** @type {LocalizedString} */ ("chat_ideas_skills");
	}
	{
		const count_noun = registry.plural("pl", i?.n, {}, true);
		if (count_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} umiejętność`);
		if (count_noun === "few") return /** @type {LocalizedString} */ (`${i?.n} umiejętności`);
		if (count_noun === "many") return /** @type {LocalizedString} */ (`${i?.n} umiejętności`);
		if (count_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} umiejętności`);
		return /** @type {LocalizedString} */ ("chat_ideas_skills");
	}
});