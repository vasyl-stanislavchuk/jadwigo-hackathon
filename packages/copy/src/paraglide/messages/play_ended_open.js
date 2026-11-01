/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} Play_Ended_OpenInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "Still open" |
* | * | "Still to come" |
*
* @param {Play_Ended_OpenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_ended_open = /** @type {((inputs: Play_Ended_OpenInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Ended_OpenInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Still open`);
		return /** @type {LocalizedString} */ (`Still to come`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`W trakcie`);
		return /** @type {LocalizedString} */ (`Jeszcze przed tobą`)
	}
});