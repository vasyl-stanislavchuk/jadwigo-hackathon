/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Ds_Wait_PlaceInputs */



/**
* | output |
* | --- |
* | "Tap the line to place the marker." |
*
* @param {Ds_Wait_PlaceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_wait_place = /** @type {((inputs?: Ds_Wait_PlaceInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Ds_Wait_PlaceInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Tap the line to place the marker.")
	return /** @type {LocalizedString} */ ("Dotknij osi, aby postawić znacznik.")
});