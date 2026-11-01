/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ time: NonNullable<unknown>, help: NonNullable<unknown> }} Parent_Review_Try_LineInputs */



/**
* | output |
* | --- |
* | "{time} · {help}" |
*
* @param {Parent_Review_Try_LineInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_review_try_line = /** @type {((inputs: Parent_Review_Try_LineInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Review_Try_LineInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.time} · ${i?.help}`)
	return /** @type {LocalizedString} */ (`${i?.time} · ${i?.help}`)
});