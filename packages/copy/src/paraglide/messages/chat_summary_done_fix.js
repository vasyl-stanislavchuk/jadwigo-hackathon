/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Summary_Done_FixInputs */



/**
* | q_noun | output |
* | --- | --- |
* | "one" | "Done, {n} question to fix" |
* | "other" | "Done, {n} questions to fix" |
*
* @param {Chat_Summary_Done_FixInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_summary_done_fix = /** @type {((inputs: Chat_Summary_Done_FixInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Summary_Done_FixInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const q_noun = registry.plural("en", i?.n, {}, true);
		if (q_noun === "one") return /** @type {LocalizedString} */ (`Done, ${i?.n} question to fix`);
		if (q_noun === "other") return /** @type {LocalizedString} */ (`Done, ${i?.n} questions to fix`);
		return /** @type {LocalizedString} */ ("chat_summary_done_fix");
	}
	{
		const q_noun = registry.plural("pl", i?.n, {}, true);
		if (q_noun === "one") return /** @type {LocalizedString} */ (`Zrobione, ${i?.n} zadanie do poprawy`);
		if (q_noun === "few") return /** @type {LocalizedString} */ (`Zrobione, ${i?.n} zadania do poprawy`);
		if (q_noun === "many") return /** @type {LocalizedString} */ (`Zrobione, ${i?.n} zadań do poprawy`);
		if (q_noun === "other") return /** @type {LocalizedString} */ (`Zrobione, ${i?.n} zadania do poprawy`);
		return /** @type {LocalizedString} */ ("chat_summary_done_fix");
	}
});