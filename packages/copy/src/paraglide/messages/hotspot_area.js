/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Hotspot_AreaInputs */



/**
* | output |
* | --- |
* | "Picture. The arrow keys move the target, Enter places a marker, Backspace lifts the last one." |
*
* @param {Hotspot_AreaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const hotspot_area = /** @type {((inputs?: Hotspot_AreaInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Hotspot_AreaInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Picture. The arrow keys move the target, Enter places a marker, Backspace lifts the last one.")
	return /** @type {LocalizedString} */ ("Obrazek. Strzałki przesuwają celownik, Enter stawia znacznik, Backspace zdejmuje ostatni.")
});