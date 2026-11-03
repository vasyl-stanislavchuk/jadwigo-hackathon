/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Play_Intro_QuestionsInputs */



/**
* | q_noun | output |
* | --- | --- |
* | "one" | "{n} question" |
* | "other" | "{n} questions" |
*
* @param {Play_Intro_QuestionsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_intro_questions = /** @type {((inputs: Play_Intro_QuestionsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Intro_QuestionsInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const q_noun = registry.plural("en", i?.n, {}, true);
		if (q_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} question`);
		if (q_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} questions`);
		return /** @type {LocalizedString} */ ("play_intro_questions");
	}
	{
		const q_noun = registry.plural("pl", i?.n, {}, true);
		if (q_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} zadanie`);
		if (q_noun === "few") return /** @type {LocalizedString} */ (`${i?.n} zadania`);
		if (q_noun === "many") return /** @type {LocalizedString} */ (`${i?.n} zadań`);
		if (q_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} zadania`);
		return /** @type {LocalizedString} */ ("play_intro_questions");
	}
});