/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Card_Fix_Reason_ShortInputs */



/**
* | q_noun | output |
* | --- | --- |
* | "one" | "{n} question needs fixing first." |
* | "other" | "{n} questions need fixing first." |
*
* @param {Card_Fix_Reason_ShortInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_fix_reason_short = /** @type {((inputs: Card_Fix_Reason_ShortInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Card_Fix_Reason_ShortInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const q_noun = registry.plural("en", i?.n, {}, true);
		if (q_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} question needs fixing first.`);
		if (q_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} questions need fixing first.`);
		return /** @type {LocalizedString} */ ("card_fix_reason_short");
	}
	{
		const q_noun = registry.plural("pl", i?.n, {}, true);
		if (q_noun === "one") return /** @type {LocalizedString} */ (`Najpierw trzeba poprawić ${i?.n} zadanie.`);
		if (q_noun === "few") return /** @type {LocalizedString} */ (`Najpierw trzeba poprawić ${i?.n} zadania.`);
		if (q_noun === "many") return /** @type {LocalizedString} */ (`Najpierw trzeba poprawić ${i?.n} zadań.`);
		if (q_noun === "other") return /** @type {LocalizedString} */ (`Najpierw trzeba poprawić ${i?.n} zadania.`);
		return /** @type {LocalizedString} */ ("card_fix_reason_short");
	}
});