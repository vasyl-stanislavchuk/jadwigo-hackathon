/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ right: NonNullable<unknown>, total: NonNullable<unknown> }} Parent_List_ScoreInputs */



/**
* | output |
* | --- |
* | "{right} of {total}" |
*
* @param {Parent_List_ScoreInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_score = /** @type {((inputs: Parent_List_ScoreInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_List_ScoreInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.right} of ${i?.total}`)
	return /** @type {LocalizedString} */ (`${i?.right} z ${i?.total}`)
});