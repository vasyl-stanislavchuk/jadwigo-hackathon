/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_List_Failed_HistoryInputs */



/**
* | output |
* | --- |
* | "Couldn't load the history" |
*
* @param {Parent_List_Failed_HistoryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_failed_history = /** @type {((inputs?: Parent_List_Failed_HistoryInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_Failed_HistoryInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Couldn't load the history")
	return /** @type {LocalizedString} */ ("Nie udało się wczytać historii")
});