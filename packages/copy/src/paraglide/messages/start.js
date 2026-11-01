/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} StartInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "Start the lesson" |
* | * | "Let's start!" |
*
* @param {StartInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const start = /** @type {((inputs: StartInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<StartInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Start the lesson`);
		return /** @type {LocalizedString} */ (`Let's start!`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Rozpocznij lekcję`);
		return /** @type {LocalizedString} */ (`Zaczynamy!`)
	}
});