/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Play_Link_IncompleteInputs */



/**
* | output |
* | --- |
* | "This link is not complete. Ask a parent for a new one." |
*
* @param {Play_Link_IncompleteInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_link_incomplete = /** @type {((inputs?: Play_Link_IncompleteInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Link_IncompleteInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This link is not complete. Ask a parent for a new one.")
	return /** @type {LocalizedString} */ ("Ten link jest niepełny. Poproś rodzica o nowy.")
});