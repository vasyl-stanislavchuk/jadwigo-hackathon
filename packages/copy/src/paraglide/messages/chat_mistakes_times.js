/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Chat_Mistakes_TimesInputs */



/**
* | count_noun | output |
* | --- | --- |
* | "one" | "{n} time" |
* | "other" | "{n} times" |
*
* @param {Chat_Mistakes_TimesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_mistakes_times = /** @type {((inputs: Chat_Mistakes_TimesInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Mistakes_TimesInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const count_noun = registry.plural("en", i?.n, {}, true);
		if (count_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} time`);
		if (count_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} times`);
		return /** @type {LocalizedString} */ ("chat_mistakes_times");
	}
	{
		const count_noun = registry.plural("pl", i?.n, {}, true);
		if (count_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} raz`);
		if (count_noun === "few") return /** @type {LocalizedString} */ (`${i?.n} razy`);
		if (count_noun === "many") return /** @type {LocalizedString} */ (`${i?.n} razy`);
		if (count_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} razy`);
		return /** @type {LocalizedString} */ ("chat_mistakes_times");
	}
});