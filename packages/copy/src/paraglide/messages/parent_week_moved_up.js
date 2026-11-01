/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Parent_Week_Moved_UpInputs */



/**
* | output |
* | --- |
* | "Skills moved forward: {n}" |
*
* @param {Parent_Week_Moved_UpInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_week_moved_up = /** @type {((inputs: Parent_Week_Moved_UpInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Week_Moved_UpInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Skills moved forward: ${i?.n}`)
	return /** @type {LocalizedString} */ (`Umiejętności do przodu: ${i?.n}`)
});