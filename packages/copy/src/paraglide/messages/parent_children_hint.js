/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Children_HintInputs */



/**
* | output |
* | --- |
* | "Add a child so Jadwigo can follow what they can do. Not needed for a lesson." |
*
* @param {Parent_Children_HintInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_children_hint = /** @type {((inputs?: Parent_Children_HintInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Children_HintInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Add a child so Jadwigo can follow what they can do. Not needed for a lesson.")
	return /** @type {LocalizedString} */ ("Dodaj dziecko, żeby Jadwigo śledziło, co umie. Nie jest potrzebne do lekcji.")
});