/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Parent_List_Archive_TitleInputs */



/**
* | n_noun | output |
* | --- | --- |
* | "one" | "Archive this lesson?" |
* | "other" | "Archive {n} lessons?" |
*
* @param {Parent_List_Archive_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_archive_title = /** @type {((inputs: Parent_List_Archive_TitleInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_Archive_TitleInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const n_noun = registry.plural("en", i?.n, {}, true);
		if (n_noun === "one") return /** @type {LocalizedString} */ (`Archive this lesson?`);
		if (n_noun === "other") return /** @type {LocalizedString} */ (`Archive ${i?.n} lessons?`);
		return /** @type {LocalizedString} */ ("parent_list_archive_title");
	}
	{
		const n_noun = registry.plural("pl", i?.n, {}, true);
		if (n_noun === "one") return /** @type {LocalizedString} */ (`Zarchiwizować lekcję?`);
		if (n_noun === "few") return /** @type {LocalizedString} */ (`Zarchiwizować ${i?.n} lekcje?`);
		if (n_noun === "many") return /** @type {LocalizedString} */ (`Zarchiwizować ${i?.n} lekcji?`);
		if (n_noun === "other") return /** @type {LocalizedString} */ (`Zarchiwizować ${i?.n} lekcji?`);
		return /** @type {LocalizedString} */ ("parent_list_archive_title");
	}
});