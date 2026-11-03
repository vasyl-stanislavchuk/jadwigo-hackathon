/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Parent_List_ChosenInputs */



/**
* | n_noun | output |
* | --- | --- |
* | "one" | "{n} chosen" |
* | "other" | "{n} chosen" |
*
* @param {Parent_List_ChosenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_chosen = /** @type {((inputs: Parent_List_ChosenInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_ChosenInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const n_noun = registry.plural("en", i?.n, {}, true);
		if (n_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} chosen`);
		if (n_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} chosen`);
		return /** @type {LocalizedString} */ ("parent_list_chosen");
	}
	{
		const n_noun = registry.plural("pl", i?.n, {}, true);
		if (n_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} wybrana`);
		if (n_noun === "few") return /** @type {LocalizedString} */ (`${i?.n} wybrane`);
		if (n_noun === "many") return /** @type {LocalizedString} */ (`${i?.n} wybranych`);
		if (n_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} wybranych`);
		return /** @type {LocalizedString} */ ("parent_list_chosen");
	}
});