/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Line_ReadInputs */



/**
* | q_noun | output |
* | --- | --- |
* | "one" | "Read the lesson: {n} question" |
* | "other" | "Read the lesson: {n} questions" |
*
* @param {Chat_Line_ReadInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_read = /** @type {((inputs: Chat_Line_ReadInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_ReadInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const q_noun = registry.plural("en", i?.n, {}, true);
		if (q_noun === "one") return /** @type {LocalizedString} */ (`Read the lesson: ${i?.n} question`);
		if (q_noun === "other") return /** @type {LocalizedString} */ (`Read the lesson: ${i?.n} questions`);
		return /** @type {LocalizedString} */ ("chat_line_read");
	}
	{
		const q_noun = registry.plural("pl", i?.n, {}, true);
		if (q_noun === "one") return /** @type {LocalizedString} */ (`Przeczytałam lekcję: ${i?.n} zadanie`);
		if (q_noun === "few") return /** @type {LocalizedString} */ (`Przeczytałam lekcję: ${i?.n} zadania`);
		if (q_noun === "many") return /** @type {LocalizedString} */ (`Przeczytałam lekcję: ${i?.n} zadań`);
		if (q_noun === "other") return /** @type {LocalizedString} */ (`Przeczytałam lekcję: ${i?.n} zadania`);
		return /** @type {LocalizedString} */ ("chat_line_read");
	}
});