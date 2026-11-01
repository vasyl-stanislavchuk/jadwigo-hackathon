/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} Move_OnInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "Skip for now" |
* | * | "Not sure yet — next" |
*
* @param {Move_OnInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const move_on = /** @type {((inputs: Move_OnInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Move_OnInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Skip for now`);
		return /** @type {LocalizedString} */ (`Not sure yet — next`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Na razie pomiń`);
		return /** @type {LocalizedString} */ (`Jeszcze nie wiem — dalej`)
	}
});