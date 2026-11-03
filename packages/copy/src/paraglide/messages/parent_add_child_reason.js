/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Add_Child_ReasonInputs */



/**
* | output |
* | --- |
* | "Type a name so your child knows it is theirs." |
*
* @param {Parent_Add_Child_ReasonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_add_child_reason = /** @type {((inputs?: Parent_Add_Child_ReasonInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Add_Child_ReasonInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Type a name so your child knows it is theirs.")
	return /** @type {LocalizedString} */ ("Wpisz imię, żeby dziecko je rozpoznało.")
});