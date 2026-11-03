/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Play_Intro_Name_MissingInputs */



/**
* | output |
* | --- |
* | "Type your name, or play without one." |
*
* @param {Play_Intro_Name_MissingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_intro_name_missing = /** @type {((inputs?: Play_Intro_Name_MissingInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Play_Intro_Name_MissingInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Type your name, or play without one.")
	return /** @type {LocalizedString} */ ("Napisz swoje imię albo zagraj bez imienia.")
});