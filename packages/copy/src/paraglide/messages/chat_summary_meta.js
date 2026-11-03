/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ k: NonNullable<unknown>, t: NonNullable<unknown> }} Chat_Summary_MetaInputs */



/**
* | steps_noun | output |
* | --- | --- |
* | "one" | "{k} step · {t}" |
* | "other" | "{k} steps · {t}" |
*
* @param {Chat_Summary_MetaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_summary_meta = /** @type {((inputs: Chat_Summary_MetaInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Summary_MetaInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const steps_noun = registry.plural("en", i?.k, {}, true);
		if (steps_noun === "one") return /** @type {LocalizedString} */ (`${i?.k} step · ${i?.t}`);
		if (steps_noun === "other") return /** @type {LocalizedString} */ (`${i?.k} steps · ${i?.t}`);
		return /** @type {LocalizedString} */ ("chat_summary_meta");
	}
	{
		const steps_noun = registry.plural("pl", i?.k, {}, true);
		if (steps_noun === "one") return /** @type {LocalizedString} */ (`${i?.k} krok · ${i?.t}`);
		if (steps_noun === "few") return /** @type {LocalizedString} */ (`${i?.k} kroki · ${i?.t}`);
		if (steps_noun === "many") return /** @type {LocalizedString} */ (`${i?.k} kroków · ${i?.t}`);
		if (steps_noun === "other") return /** @type {LocalizedString} */ (`${i?.k} kroku · ${i?.t}`);
		return /** @type {LocalizedString} */ ("chat_summary_meta");
	}
});