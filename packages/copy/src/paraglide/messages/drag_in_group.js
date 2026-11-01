/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ item: NonNullable<unknown>, group: NonNullable<unknown> }} Drag_In_GroupInputs */



/**
* | output |
* | --- |
* | "{item} is in {group}." |
*
* @param {Drag_In_GroupInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const drag_in_group = /** @type {((inputs: Drag_In_GroupInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Drag_In_GroupInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.item} is in ${i?.group}.`)
	return /** @type {LocalizedString} */ (`${i?.item} jest w grupie: ${i?.group}.`)
});