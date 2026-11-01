/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Borrow_ErrorInputs */



/**
* | output |
* | --- |
* | "Borrowed in another column" |
*
* @param {Parent_Mistake_Borrow_ErrorInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_borrow_error = /** @type {((inputs?: Parent_Mistake_Borrow_ErrorInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Borrow_ErrorInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Borrowed in another column")
	return /** @type {LocalizedString} */ ("Pożyczanie w innej kolumnie")
});