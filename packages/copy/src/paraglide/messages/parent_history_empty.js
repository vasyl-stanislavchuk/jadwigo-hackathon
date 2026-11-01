/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_History_EmptyInputs */



/**
* | output |
* | --- |
* | "Every lesson done will appear here, with its result question by question." |
*
* @param {Parent_History_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_history_empty = /** @type {((inputs?: Parent_History_EmptyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_History_EmptyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Every lesson done will appear here, with its result question by question.")
	return /** @type {LocalizedString} */ ("Tu pojawi się każda zrobiona lekcja, z wynikiem pytanie po pytaniu.")
});