/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} Play_Ended_SkippedInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "Skipped" |
* | * | "We will come back to it." |
*
* @param {Play_Ended_SkippedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_ended_skipped = /** @type {((inputs: Play_Ended_SkippedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Ended_SkippedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Skipped`);
		return /** @type {LocalizedString} */ (`We will come back to it.`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Pominięte`);
		return /** @type {LocalizedString} */ (`Wrócimy do tego`)
	}
});