/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ date: NonNullable<unknown> }} Parent_Ai_GivenInputs */



/**
* | output |
* | --- |
* | "Given on {date}." |
*
* @param {Parent_Ai_GivenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_ai_given = /** @type {((inputs: Parent_Ai_GivenInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Ai_GivenInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Given on ${i?.date}.`)
	return /** @type {LocalizedString} */ (`Zgoda dana ${i?.date}.`)
});