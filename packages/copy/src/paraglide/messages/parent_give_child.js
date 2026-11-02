/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ name: NonNullable<unknown> }} Parent_Give_ChildInputs */



/**
* | output |
* | --- |
* | "Give the lesson · {name}" |
*
* @param {Parent_Give_ChildInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_give_child = /** @type {((inputs: Parent_Give_ChildInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Give_ChildInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Give the lesson · ${i?.name}`)
	return /** @type {LocalizedString} */ (`Daj lekcję · ${i?.name}`)
});