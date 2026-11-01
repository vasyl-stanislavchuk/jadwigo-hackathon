/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} Play_Ended_MissedInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "Not yet" |
* | * | "Still learning this one" |
*
* @param {Play_Ended_MissedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_ended_missed = /** @type {((inputs: Play_Ended_MissedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Ended_MissedInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Not yet`);
		return /** @type {LocalizedString} */ (`Still learning this one`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Jeszcze nie`);
		return /** @type {LocalizedString} */ (`Jeszcze się uczymy`)
	}
});