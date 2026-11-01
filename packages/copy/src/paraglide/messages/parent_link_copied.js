/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Link_CopiedInputs */



/**
* | output |
* | --- |
* | "Copied. Paste it into your browser." |
*
* @param {Parent_Link_CopiedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_link_copied = /** @type {((inputs?: Parent_Link_CopiedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Link_CopiedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Copied. Paste it into your browser.")
	return /** @type {LocalizedString} */ ("Skopiowano. Wklej go w przeglądarce.")
});