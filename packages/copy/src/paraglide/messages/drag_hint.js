/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Drag_HintInputs */



/**
* | output |
* | --- |
* | "Drag a card, or tap it and then tap the right place." |
*
* @param {Drag_HintInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const drag_hint = /** @type {((inputs?: Drag_HintInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Drag_HintInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Drag a card, or tap it and then tap the right place.")
	return /** @type {LocalizedString} */ ("Przeciągnij kartę albo dotknij jej, a potem właściwego miejsca.")
});