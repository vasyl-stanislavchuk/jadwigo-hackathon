/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Give_ReasonInputs */



/**
* | output |
* | --- |
* | "“Give the lesson” works once the lesson passes its check" |
*
* @param {Parent_Give_ReasonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_give_reason = /** @type {((inputs?: Parent_Give_ReasonInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Give_ReasonInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("“Give the lesson” works once the lesson passes its check")
	return /** @type {LocalizedString} */ ("„Daj lekcję” zadziała, gdy lekcja przejdzie sprawdzenie")
});