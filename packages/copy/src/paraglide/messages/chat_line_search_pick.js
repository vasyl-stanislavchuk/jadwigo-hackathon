/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown>, grade: NonNullable<unknown> }} Chat_Line_Search_PickInputs */



/**
* | sets_noun | output |
* | --- | --- |
* | "one" | "Picked {n} set that fits grade {grade}" |
* | "other" | "Picked {n} sets that fit grade {grade}" |
*
* @param {Chat_Line_Search_PickInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_search_pick = /** @type {((inputs: Chat_Line_Search_PickInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Line_Search_PickInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const sets_noun = registry.plural("en", i?.n, {}, true);
		if (sets_noun === "one") return /** @type {LocalizedString} */ (`Picked ${i?.n} set that fits grade ${i?.grade}`);
		if (sets_noun === "other") return /** @type {LocalizedString} */ (`Picked ${i?.n} sets that fit grade ${i?.grade}`);
		return /** @type {LocalizedString} */ ("chat_line_search_pick");
	}
	{
		const sets_noun = registry.plural("pl", i?.n, {}, true);
		if (sets_noun === "one") return /** @type {LocalizedString} */ (`Wybrałam ${i?.n} zestaw, który pasuje do ${i?.grade} klasy`);
		if (sets_noun === "few") return /** @type {LocalizedString} */ (`Wybrałam ${i?.n} zestawy, które pasują do ${i?.grade} klasy`);
		if (sets_noun === "many") return /** @type {LocalizedString} */ (`Wybrałam ${i?.n} zestawów, które pasują do ${i?.grade} klasy`);
		if (sets_noun === "other") return /** @type {LocalizedString} */ (`Wybrałam ${i?.n} zestawu, które pasują do ${i?.grade} klasy`);
		return /** @type {LocalizedString} */ ("chat_line_search_pick");
	}
});