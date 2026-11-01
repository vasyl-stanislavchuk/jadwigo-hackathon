/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown> }} Tutor_RestingInputs */



/**
* | category | output |
* | --- | --- |
* | "adult" | "Practising without voice today." |
* | * | "Quiet practice today." |
*
* @param {Tutor_RestingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const tutor_resting = /** @type {((inputs: Tutor_RestingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Tutor_RestingInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Practising without voice today.`);
		return /** @type {LocalizedString} */ (`Quiet practice today.`)
	}
	{
		if (i?.category === "adult") return /** @type {LocalizedString} */ (`Dziś ćwiczysz bez głosu.`);
		return /** @type {LocalizedString} */ (`Dziś ćwiczymy po cichu.`)
	}
});