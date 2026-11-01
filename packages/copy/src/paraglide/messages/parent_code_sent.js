/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ email: NonNullable<unknown> }} Parent_Code_SentInputs */



/**
* | output |
* | --- |
* | "We sent a code to {email}." |
*
* @param {Parent_Code_SentInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_code_sent = /** @type {((inputs: Parent_Code_SentInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Code_SentInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`We sent a code to ${i?.email}.`)
	return /** @type {LocalizedString} */ (`Wysłaliśmy kod na ${i?.email}.`)
});