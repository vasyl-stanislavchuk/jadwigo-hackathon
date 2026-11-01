/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} Play_Ended_DoneInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "Done" |
* | * | "Done" |
*
* @param {Play_Ended_DoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_ended_done = /** @type {((inputs: Play_Ended_DoneInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Ended_DoneInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Done`);
		return /** @type {LocalizedString} */ (`Done`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Zrobione`);
		return /** @type {LocalizedString} */ (`Zrobione`)
	}
});