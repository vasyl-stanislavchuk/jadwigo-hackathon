/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Add_Child_HintInputs */



/**
* | output |
* | --- |
* | "Name and class. Jadwigo will start following what they can do." |
*
* @param {Parent_Add_Child_HintInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_add_child_hint = /** @type {((inputs?: Parent_Add_Child_HintInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Add_Child_HintInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Name and class. Jadwigo will start following what they can do.")
	return /** @type {LocalizedString} */ ("Imię i klasa. Jadwigo zacznie śledzić, co umie.")
});