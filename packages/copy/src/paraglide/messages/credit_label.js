/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ source: NonNullable<unknown> }} Credit_LabelInputs */



/**
* | output |
* | --- |
* | "from {source}, source and licence" |
*
* @param {Credit_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_label = /** @type {((inputs: Credit_LabelInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Credit_LabelInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`from ${i?.source}, source and licence`)
	return /** @type {LocalizedString} */ (`z ${i?.source}, źródło i licencja`)
});