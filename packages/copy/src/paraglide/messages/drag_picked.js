/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ item: NonNullable<unknown> }} Drag_PickedInputs */



/**
* | output |
* | --- |
* | "{item}: now tap the right place." |
*
* @param {Drag_PickedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const drag_picked = /** @type {((inputs: Drag_PickedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Drag_PickedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`${i?.item}: now tap the right place.`)
	return /** @type {LocalizedString} */ (`${i?.item}: teraz dotknij właściwego miejsca.`)
});