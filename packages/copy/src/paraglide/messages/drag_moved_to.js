/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ item: NonNullable<unknown>, n: NonNullable<unknown> }} Drag_Moved_ToInputs */



/**
* | output |
* | --- |
* | "{item} is now in place {n}." |
*
* @param {Drag_Moved_ToInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const drag_moved_to = /** @type {((inputs: Drag_Moved_ToInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Drag_Moved_ToInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.item} is now in place ${i?.n}.`)
	return /** @type {LocalizedString} */ (`${i?.item} jest teraz na miejscu ${i?.n}.`)
});