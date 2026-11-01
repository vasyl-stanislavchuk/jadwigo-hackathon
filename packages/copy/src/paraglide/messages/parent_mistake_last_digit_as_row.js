/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Last_Digit_As_RowInputs */



/**
* | output |
* | --- |
* | "The last digit taken for the times-table row" |
*
* @param {Parent_Mistake_Last_Digit_As_RowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_last_digit_as_row = /** @type {((inputs?: Parent_Mistake_Last_Digit_As_RowInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Last_Digit_As_RowInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The last digit taken for the times-table row")
	return /** @type {LocalizedString} */ ("Ostatnia cyfra wzięta za rząd tabliczki")
});