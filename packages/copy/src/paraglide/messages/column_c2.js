/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Column_C2Inputs */



/**
* | output |
* | --- |
* | "the small box in the hundreds column" |
*
* @param {Column_C2Inputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const column_c2 = /** @type {((inputs?: Column_C2Inputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Column_C2Inputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("the small box in the hundreds column")
	return /** @type {LocalizedString} */ ("mała kratka w kolumnie setek")
});