/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ date: NonNullable<unknown> }} Parent_Account_SinceInputs */



/**
* | output |
* | --- |
* | "Account made on {date}." |
*
* @param {Parent_Account_SinceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_account_since = /** @type {((inputs: Parent_Account_SinceInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Account_SinceInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Account made on ${i?.date}.`)
	return /** @type {LocalizedString} */ (`Konto założone ${i?.date}.`)
});