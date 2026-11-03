/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Parent_List_ShowInputs */



/**
* | n_noun | output |
* | --- | --- |
* | "one" | "Show {n} lesson" |
* | "other" | "Show {n} lessons" |
*
* @param {Parent_List_ShowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_show = /** @type {((inputs: Parent_List_ShowInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_ShowInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const n_noun = registry.plural("en", i?.n, {}, true);
		if (n_noun === "one") return /** @type {LocalizedString} */ (`Show ${i?.n} lesson`);
		if (n_noun === "other") return /** @type {LocalizedString} */ (`Show ${i?.n} lessons`);
		return /** @type {LocalizedString} */ ("parent_list_show");
	}
	{
		const n_noun = registry.plural("pl", i?.n, {}, true);
		if (n_noun === "one") return /** @type {LocalizedString} */ (`Pokaż ${i?.n} lekcję`);
		if (n_noun === "few") return /** @type {LocalizedString} */ (`Pokaż ${i?.n} lekcje`);
		if (n_noun === "many") return /** @type {LocalizedString} */ (`Pokaż ${i?.n} lekcji`);
		if (n_noun === "other") return /** @type {LocalizedString} */ (`Pokaż ${i?.n} lekcji`);
		return /** @type {LocalizedString} */ ("parent_list_show");
	}
});