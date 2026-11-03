/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ query: NonNullable<unknown>, grade: NonNullable<unknown>, n: NonNullable<unknown> }} Chat_Line_SearchInputs */



/**
* | sets_noun | output |
* | --- | --- |
* | "one" | "Searched “{query}” in grade {grade}: {n} set" |
* | "other" | "Searched “{query}” in grade {grade}: {n} sets" |
*
* @param {Chat_Line_SearchInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_search = /** @type {((inputs: Chat_Line_SearchInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_SearchInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const sets_noun = registry.plural("en", i?.n, {}, true);
		if (sets_noun === "one") return /** @type {LocalizedString} */ (`Searched “${i?.query}” in grade ${i?.grade}: ${i?.n} set`);
		if (sets_noun === "other") return /** @type {LocalizedString} */ (`Searched “${i?.query}” in grade ${i?.grade}: ${i?.n} sets`);
		return /** @type {LocalizedString} */ ("chat_line_search");
	}
	{
		const sets_noun = registry.plural("pl", i?.n, {}, true);
		if (sets_noun === "one") return /** @type {LocalizedString} */ (`Szukałam „${i?.query}” w klasie ${i?.grade}: ${i?.n} zestaw`);
		if (sets_noun === "few") return /** @type {LocalizedString} */ (`Szukałam „${i?.query}” w klasie ${i?.grade}: ${i?.n} zestawy`);
		if (sets_noun === "many") return /** @type {LocalizedString} */ (`Szukałam „${i?.query}” w klasie ${i?.grade}: ${i?.n} zestawów`);
		if (sets_noun === "other") return /** @type {LocalizedString} */ (`Szukałam „${i?.query}” w klasie ${i?.grade}: ${i?.n} zestawu`);
		return /** @type {LocalizedString} */ ("chat_line_search");
	}
});