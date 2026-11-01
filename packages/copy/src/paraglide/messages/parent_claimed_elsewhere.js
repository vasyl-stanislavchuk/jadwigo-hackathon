/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Claimed_ElsewhereInputs */



/**
* | output |
* | --- |
* | "This lesson is already saved on another account." |
*
* @param {Parent_Claimed_ElsewhereInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_claimed_elsewhere = /** @type {((inputs?: Parent_Claimed_ElsewhereInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Claimed_ElsewhereInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("This lesson is already saved on another account.")
	return /** @type {LocalizedString} */ ("Ta lekcja jest już zapisana na innym koncie.")
});