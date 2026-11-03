/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ query: NonNullable<unknown>, n: NonNullable<unknown> }} Chat_Line_Search_AnyInputs */



/**
* | sets_noun | output |
* | --- | --- |
* | "one" | "Searched “{query}”: {n} set" |
* | "other" | "Searched “{query}”: {n} sets" |
*
* @param {Chat_Line_Search_AnyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_search_any = /** @type {((inputs: Chat_Line_Search_AnyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_Search_AnyInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const sets_noun = registry.plural("en", i?.n, {}, true);
		if (sets_noun === "one") return /** @type {LocalizedString} */ (`Searched “${i?.query}”: ${i?.n} set`);
		if (sets_noun === "other") return /** @type {LocalizedString} */ (`Searched “${i?.query}”: ${i?.n} sets`);
		return /** @type {LocalizedString} */ ("chat_line_search_any");
	}
	{
		const sets_noun = registry.plural("pl", i?.n, {}, true);
		if (sets_noun === "one") return /** @type {LocalizedString} */ (`Szukałam „${i?.query}”: ${i?.n} zestaw`);
		if (sets_noun === "few") return /** @type {LocalizedString} */ (`Szukałam „${i?.query}”: ${i?.n} zestawy`);
		if (sets_noun === "many") return /** @type {LocalizedString} */ (`Szukałam „${i?.query}”: ${i?.n} zestawów`);
		if (sets_noun === "other") return /** @type {LocalizedString} */ (`Szukałam „${i?.query}”: ${i?.n} zestawu`);
		return /** @type {LocalizedString} */ ("chat_line_search_any");
	}
});