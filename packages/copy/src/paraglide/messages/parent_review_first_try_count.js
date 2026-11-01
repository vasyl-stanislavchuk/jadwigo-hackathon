/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Parent_Review_First_Try_CountInputs */



/**
* | output |
* | --- |
* | "Right on the first try: {n}" |
*
* @param {Parent_Review_First_Try_CountInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_review_first_try_count = /** @type {((inputs: Parent_Review_First_Try_CountInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Review_First_Try_CountInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Right on the first try: ${i?.n}`)
	return /** @type {LocalizedString} */ (`Dobrze za pierwszym razem: ${i?.n}`)
});