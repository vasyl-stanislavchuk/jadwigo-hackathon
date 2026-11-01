/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Add_Child_MenuInputs */



/**
* | output |
* | --- |
* | "Add a child…" |
*
* @param {Parent_Add_Child_MenuInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_add_child_menu = /** @type {((inputs?: Parent_Add_Child_MenuInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Add_Child_MenuInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Add a child…")
	return /** @type {LocalizedString} */ ("Dodaj dziecko…")
});