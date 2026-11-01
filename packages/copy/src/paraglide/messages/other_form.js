/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ form: NonNullable<unknown> }} Other_FormInputs */



/**
* | output |
* | --- |
* | "You could also write: {form}" |
*
* @param {Other_FormInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const other_form = /** @type {((inputs: Other_FormInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Other_FormInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`You could also write: ${i?.form}`)
	return /** @type {LocalizedString} */ (`Można też napisać: ${i?.form}`)
});