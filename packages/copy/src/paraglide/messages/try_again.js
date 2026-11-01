/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ category: NonNullable<unknown>, line: 0 | "0" | 1 | "1" }} Try_AgainInputs */



/**
* | category | line | output |
* | --- | --- | --- |
* | "adult" | "0" | "Not quite. Have another go." |
* | "adult" | "1" | "Take another look and try again." |
* | * | "0" | "Let's try that one again." |
* | * | "1" | "Take another look — you can do it." |
*
* @param {Try_AgainInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const try_again = /** @type {((inputs: Try_AgainInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Try_AgainInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") {
		if (i?.category === "adult" && (i?.line === 0 || i?.line === "0")) return /** @type {LocalizedString} */ (`Not quite. Have another go.`);
		if (i?.category === "adult" && (i?.line === 1 || i?.line === "1")) return /** @type {LocalizedString} */ (`Take another look and try again.`);
		if ((i?.line === 0 || i?.line === "0")) return /** @type {LocalizedString} */ (`Let's try that one again.`);
		if ((i?.line === 1 || i?.line === "1")) return /** @type {LocalizedString} */ (`Take another look — you can do it.`);
		return /** @type {LocalizedString} */ ("try_again");
	}
	{
		if (i?.category === "adult" && (i?.line === 0 || i?.line === "0")) return /** @type {LocalizedString} */ (`Jeszcze nie całkiem. Spróbuj ponownie.`);
		if (i?.category === "adult" && (i?.line === 1 || i?.line === "1")) return /** @type {LocalizedString} */ (`Przyjrzyj się jeszcze raz i spróbuj ponownie.`);
		if ((i?.line === 0 || i?.line === "0")) return /** @type {LocalizedString} */ (`Spróbujmy jeszcze raz.`);
		if ((i?.line === 1 || i?.line === "1")) return /** @type {LocalizedString} */ (`Pomyśl jeszcze chwilę — dasz radę.`);
		return /** @type {LocalizedString} */ ("try_again");
	}
});