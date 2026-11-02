/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ right: NonNullable<unknown>, total: NonNullable<unknown> }} Parent_Result_RightInputs */



/**
* | output |
* | --- |
* | "{right} of {total} right" |
*
* @param {Parent_Result_RightInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_result_right = /** @type {((inputs: Parent_Result_RightInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Result_RightInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.right} of ${i?.total} right`)
	return /** @type {LocalizedString} */ (`${i?.right} z ${i?.total} dobrze`)
});