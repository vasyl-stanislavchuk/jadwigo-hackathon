/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown>, line: 0 | "0" | 1 | "1" | 2 | "2" }} PraiseInputs */



/**
* | category | line | output |
* | --- | --- | --- |
* | "adult" | "0" | "That's right." |
* | "adult" | "1" | "Exactly." |
* | "adult" | "2" | "Good, that works." |
* | * | "0" | "Yes, that's it!" |
* | * | "1" | "Great work!" |
* | * | "2" | "Nice thinking!" |
*
* @param {PraiseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const praise = /** @type {((inputs: PraiseInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<PraiseInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult" && (i?.line === 0 || i?.line === "0")) return /** @type {LocalizedString} */ (`That's right.`);
		if (i?.category === "adult" && (i?.line === 1 || i?.line === "1")) return /** @type {LocalizedString} */ (`Exactly.`);
		if (i?.category === "adult" && (i?.line === 2 || i?.line === "2")) return /** @type {LocalizedString} */ (`Good, that works.`);
		if ((i?.line === 0 || i?.line === "0")) return /** @type {LocalizedString} */ (`Yes, that's it!`);
		if ((i?.line === 1 || i?.line === "1")) return /** @type {LocalizedString} */ (`Great work!`);
		if ((i?.line === 2 || i?.line === "2")) return /** @type {LocalizedString} */ (`Nice thinking!`);
		return /** @type {LocalizedString} */ ("praise");
	}
	{
		if (i?.category === "adult" && (i?.line === 0 || i?.line === "0")) return /** @type {LocalizedString} */ (`Zgadza się.`);
		if (i?.category === "adult" && (i?.line === 1 || i?.line === "1")) return /** @type {LocalizedString} */ (`Dokładnie tak.`);
		if (i?.category === "adult" && (i?.line === 2 || i?.line === "2")) return /** @type {LocalizedString} */ (`Dobrze, to działa.`);
		if ((i?.line === 0 || i?.line === "0")) return /** @type {LocalizedString} */ (`Tak, właśnie tak!`);
		if ((i?.line === 1 || i?.line === "1")) return /** @type {LocalizedString} */ (`Świetna robota!`);
		if ((i?.line === 2 || i?.line === "2")) return /** @type {LocalizedString} */ (`Dobrze pomyślane!`);
		return /** @type {LocalizedString} */ ("praise");
	}
});