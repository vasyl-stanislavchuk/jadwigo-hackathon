/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Play_Paused_BackInputs */



/**
* | output |
* | --- |
* | "Back to the lesson" |
*
* @param {Play_Paused_BackInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_paused_back = /** @type {((inputs?: Play_Paused_BackInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Paused_BackInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Back to the lesson")
	return /** @type {LocalizedString} */ ("Wracam do lekcji")
});