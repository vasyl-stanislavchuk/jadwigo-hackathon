/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Mistake_Borrow_Not_MarkedInputs */



/**
* | output |
* | --- |
* | "The borrow not written down" |
*
* @param {Parent_Mistake_Borrow_Not_MarkedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_borrow_not_marked = /** @type {((inputs?: Parent_Mistake_Borrow_Not_MarkedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Mistake_Borrow_Not_MarkedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("The borrow not written down")
	return /** @type {LocalizedString} */ ("Niezapisane pożyczanie")
});