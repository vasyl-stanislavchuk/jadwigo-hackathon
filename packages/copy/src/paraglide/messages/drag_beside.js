/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ item: NonNullable<unknown>, other: NonNullable<unknown> }} Drag_BesideInputs */



/**
* | output |
* | --- |
* | "{item} is now beside {other}." |
*
* @param {Drag_BesideInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const drag_beside = /** @type {((inputs: Drag_BesideInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Drag_BesideInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.item} is now beside ${i?.other}.`)
	return /** @type {LocalizedString} */ (`${i?.item} jest teraz obok: ${i?.other}.`)
});