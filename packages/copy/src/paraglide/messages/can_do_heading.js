/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} Can_Do_HeadingInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "What you can do now" |
* | * | "What I can do" |
*
* @param {Can_Do_HeadingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const can_do_heading = /** @type {((inputs: Can_Do_HeadingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Can_Do_HeadingInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`What you can do now`);
		return /** @type {LocalizedString} */ (`What I can do`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Co już potrafisz`);
		return /** @type {LocalizedString} */ (`Co już umiem`)
	}
});