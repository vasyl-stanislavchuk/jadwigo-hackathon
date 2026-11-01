/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Claim_PreviewInputs */



/**
* | output |
* | --- |
* | "This lesson was a try-out, so it is not saved." |
*
* @param {Parent_Claim_PreviewInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_claim_preview = /** @type {((inputs?: Parent_Claim_PreviewInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Claim_PreviewInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This lesson was a try-out, so it is not saved.")
	return /** @type {LocalizedString} */ ("Ta lekcja była na próbę, więc nie zapisujemy jej.")
});