/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} Mic_CheckInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "Microphone check (coming soon)" |
* | * | "Microphone check — coming soon" |
*
* @param {Mic_CheckInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const mic_check = /** @type {((inputs: Mic_CheckInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Mic_CheckInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Microphone check (coming soon)`);
		return /** @type {LocalizedString} */ (`Microphone check — coming soon`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Sprawdzanie mikrofonu (wkrótce)`);
		return /** @type {LocalizedString} */ (`Sprawdzanie mikrofonu — już wkrótce`)
	}
});