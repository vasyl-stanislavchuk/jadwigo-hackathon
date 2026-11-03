/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_List_Clear_ChoiceInputs */



/**
* | output |
* | --- |
* | "Clear choice" |
*
* @param {Parent_List_Clear_ChoiceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_clear_choice = /** @type {((inputs?: Parent_List_Clear_ChoiceInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_Clear_ChoiceInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Clear choice")
	return /** @type {LocalizedString} */ ("Wyczyść wybór")
});