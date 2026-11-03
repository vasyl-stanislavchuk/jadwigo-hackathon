/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Given_AnyoneInputs */



/**
* | output |
* | --- |
* | "Anyone with this link can play and type their name." |
*
* @param {Parent_Given_AnyoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_given_anyone = /** @type {((inputs?: Parent_Given_AnyoneInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Given_AnyoneInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Anyone with this link can play and type their name.")
	return /** @type {LocalizedString} */ ("Każdy, kto ma ten link, może zagrać i wpisać swoje imię.")
});