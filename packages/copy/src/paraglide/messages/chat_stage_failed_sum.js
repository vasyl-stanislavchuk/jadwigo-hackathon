/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Stage_Failed_SumInputs */



/**
* | tries_noun | output |
* | --- | --- |
* | "one" | "didn't work after {n} try" |
* | "other" | "didn't work after {n} tries" |
*
* @param {Chat_Stage_Failed_SumInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stage_failed_sum = /** @type {((inputs: Chat_Stage_Failed_SumInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Stage_Failed_SumInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const tries_noun = registry.plural("en", i?.n, {}, true);
		if (tries_noun === "one") return /** @type {LocalizedString} */ (`didn't work after ${i?.n} try`);
		if (tries_noun === "other") return /** @type {LocalizedString} */ (`didn't work after ${i?.n} tries`);
		return /** @type {LocalizedString} */ ("chat_stage_failed_sum");
	}
	{
		const tries_noun = registry.plural("pl", i?.n, {}, true);
		if (tries_noun === "one") return /** @type {LocalizedString} */ (`nie wyszło po ${i?.n} próbie`);
		if (tries_noun === "few") return /** @type {LocalizedString} */ (`nie wyszło po ${i?.n} próbach`);
		if (tries_noun === "many") return /** @type {LocalizedString} */ (`nie wyszło po ${i?.n} próbach`);
		if (tries_noun === "other") return /** @type {LocalizedString} */ (`nie wyszło po ${i?.n} próbach`);
		return /** @type {LocalizedString} */ ("chat_stage_failed_sum");
	}
});