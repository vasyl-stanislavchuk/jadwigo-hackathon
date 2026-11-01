/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Tool_CountInputs */



/**
* | steps_noun | output |
* | --- | --- |
* | "one" | "{n} step" |
* | "other" | "{n} steps" |
*
* @param {Chat_Tool_CountInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_count = /** @type {((inputs: Chat_Tool_CountInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_CountInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const steps_noun = registry.plural("en", i?.n, {}, true);
		if (steps_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} step`);
		if (steps_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} steps`);
		return /** @type {LocalizedString} */ ("chat_tool_count");
	}
	{
		const steps_noun = registry.plural("pl", i?.n, {}, true);
		if (steps_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} krok`);
		if (steps_noun === "few") return /** @type {LocalizedString} */ (`${i?.n} kroki`);
		if (steps_noun === "many") return /** @type {LocalizedString} */ (`${i?.n} kroków`);
		if (steps_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} kroku`);
		return /** @type {LocalizedString} */ ("chat_tool_count");
	}
});