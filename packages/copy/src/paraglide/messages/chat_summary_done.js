/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Summary_DoneInputs */



/**
* | stages_noun | output |
* | --- | --- |
* | "one" | "Done in {n} stage" |
* | "other" | "Done in {n} stages" |
*
* @param {Chat_Summary_DoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_summary_done = /** @type {((inputs: Chat_Summary_DoneInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Summary_DoneInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const stages_noun = registry.plural("en", i?.n, {}, true);
		if (stages_noun === "one") return /** @type {LocalizedString} */ (`Done in ${i?.n} stage`);
		if (stages_noun === "other") return /** @type {LocalizedString} */ (`Done in ${i?.n} stages`);
		return /** @type {LocalizedString} */ ("chat_summary_done");
	}
	{
		const stages_noun = registry.plural("pl", i?.n, {}, true);
		if (stages_noun === "one") return /** @type {LocalizedString} */ (`Zrobione w ${i?.n} etapie`);
		if (stages_noun === "few") return /** @type {LocalizedString} */ (`Zrobione w ${i?.n} etapach`);
		if (stages_noun === "many") return /** @type {LocalizedString} */ (`Zrobione w ${i?.n} etapach`);
		if (stages_noun === "other") return /** @type {LocalizedString} */ (`Zrobione w ${i?.n} etapach`);
		return /** @type {LocalizedString} */ ("chat_summary_done");
	}
});