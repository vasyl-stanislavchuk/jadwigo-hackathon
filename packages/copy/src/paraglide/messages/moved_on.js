/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} Moved_OnInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "Fine, we'll come back to this one." |
* | * | "Okay, we'll come back to it." |
*
* @param {Moved_OnInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const moved_on = /** @type {((inputs: Moved_OnInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Moved_OnInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Fine, we'll come back to this one.`);
		return /** @type {LocalizedString} */ (`Okay, we'll come back to it.`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`W porządku, wrócimy do tego zadania.`);
		return /** @type {LocalizedString} */ (`Dobrze, wrócimy do tego.`)
	}
});