/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, topic: NonNullable<unknown> }} Chat_Line_DraftInputs */



/**
* | q_noun | output |
* | --- | --- |
* | "one" | "Built {n} question on {topic}" |
* | "other" | "Built {n} questions on {topic}" |
*
* @param {Chat_Line_DraftInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_draft = /** @type {((inputs: Chat_Line_DraftInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_DraftInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const q_noun = registry.plural("en", i?.n, {}, true);
		if (q_noun === "one") return /** @type {LocalizedString} */ (`Built ${i?.n} question on ${i?.topic}`);
		if (q_noun === "other") return /** @type {LocalizedString} */ (`Built ${i?.n} questions on ${i?.topic}`);
		return /** @type {LocalizedString} */ ("chat_line_draft");
	}
	{
		const q_noun = registry.plural("pl", i?.n, {}, true);
		if (q_noun === "one") return /** @type {LocalizedString} */ (`Ułożyłam ${i?.n} zadanie z ${i?.topic}`);
		if (q_noun === "few") return /** @type {LocalizedString} */ (`Ułożyłam ${i?.n} zadania z ${i?.topic}`);
		if (q_noun === "many") return /** @type {LocalizedString} */ (`Ułożyłam ${i?.n} zadań z ${i?.topic}`);
		if (q_noun === "other") return /** @type {LocalizedString} */ (`Ułożyłam ${i?.n} zadania z ${i?.topic}`);
		return /** @type {LocalizedString} */ ("chat_line_draft");
	}
});