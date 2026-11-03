/* eslint-disable */
import * as registry from '../registry.js'
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Parent_List_SelectedInputs */



/**
* | n_noun | output |
* | --- | --- |
* | "one" | "{n} selected" |
* | "other" | "{n} selected" |
*
* @param {Parent_List_SelectedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_selected = /** @type {((inputs: Parent_List_SelectedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_SelectedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		const n_noun = registry.plural("en", i?.n, {}, true);
		if (n_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} selected`);
		if (n_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} selected`);
		return /** @type {LocalizedString} */ ("parent_list_selected");
	}
	{
		const n_noun = registry.plural("pl", i?.n, {}, true);
		if (n_noun === "one") return /** @type {LocalizedString} */ (`${i?.n} zaznaczona`);
		if (n_noun === "few") return /** @type {LocalizedString} */ (`${i?.n} zaznaczone`);
		if (n_noun === "many") return /** @type {LocalizedString} */ (`${i?.n} zaznaczonych`);
		if (n_noun === "other") return /** @type {LocalizedString} */ (`${i?.n} zaznaczonych`);
		return /** @type {LocalizedString} */ ("parent_list_selected");
	}
});