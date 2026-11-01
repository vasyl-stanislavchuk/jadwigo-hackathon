/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Child_History_EmptyInputs */



/**
* | output |
* | --- |
* | "Every lesson this child does will appear here, with its result question by question." |
*
* @param {Parent_Child_History_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_child_history_empty = /** @type {((inputs?: Parent_Child_History_EmptyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Child_History_EmptyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Every lesson this child does will appear here, with its result question by question.")
	return /** @type {LocalizedString} */ ("Tu pojawi się każda lekcja, którą zrobi to dziecko, z wynikiem pytanie po pytaniu.")
});