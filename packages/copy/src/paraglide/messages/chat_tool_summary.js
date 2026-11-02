/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, last: NonNullable<unknown> }} Chat_Tool_SummaryInputs */



/**
* | steps_noun | output |
* | --- | --- |
* | "one" | "{n} step · last: {last}" |
* | "other" | "{n} steps · last: {last}" |
*
* @param {Chat_Tool_SummaryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_summary = /** @type {((inputs: Chat_Tool_SummaryInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_SummaryInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const steps_noun = registry.plural("en", i?.n, {}, true);
		if (steps_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} step · last: ${i?.last}`);
		if (steps_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} steps · last: ${i?.last}`);
		return /** @type {LocalizedString} */ ("chat_tool_summary");
	}
	{
		const steps_noun = registry.plural("pl", i?.n, {}, true);
		if (steps_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} krok · ostatni: ${i?.last}`);
		if (steps_noun === "few") return /** @type {LocalizedString} */ (`${i?.n} kroki · ostatni: ${i?.last}`);
		if (steps_noun === "many") return /** @type {LocalizedString} */ (`${i?.n} kroków · ostatni: ${i?.last}`);
		if (steps_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} kroku · ostatni: ${i?.last}`);
		return /** @type {LocalizedString} */ ("chat_tool_summary");
	}
});