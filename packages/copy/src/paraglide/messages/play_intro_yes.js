/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ name: NonNullable<unknown> }} Play_Intro_YesInputs */



/**
* | output |
* | --- |
* | "Yes, I'm {name}" |
*
* @param {Play_Intro_YesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_intro_yes = /** @type {((inputs: Play_Intro_YesInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Intro_YesInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Yes, I'm ${i?.name}`)
	return /** @type {LocalizedString} */ (`Tak, jestem ${i?.name}`)
});