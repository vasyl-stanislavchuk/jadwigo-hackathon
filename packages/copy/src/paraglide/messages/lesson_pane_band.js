/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ n: NonNullable<unknown> }} Lesson_Pane_BandInputs */



/**
* | output |
* | --- |
* | "Jadwigo is changing this lesson. Version {n} will appear here." |
*
* @param {Lesson_Pane_BandInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const lesson_pane_band = /** @type {((inputs: Lesson_Pane_BandInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Lesson_Pane_BandInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Jadwigo is changing this lesson. Version ${i?.n} will appear here.`)
	return /** @type {LocalizedString} */ (`Jadwigo zmienia tę lekcję. Wersja ${i?.n} pojawi się tutaj.`)
});