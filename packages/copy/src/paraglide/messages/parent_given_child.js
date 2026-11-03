/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ name: NonNullable<unknown> }} Parent_Given_ChildInputs */



/**
* | output |
* | --- |
* | "The lesson is waiting for {name}." |
*
* @param {Parent_Given_ChildInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_given_child = /** @type {((inputs: Parent_Given_ChildInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Given_ChildInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`The lesson is waiting for ${i?.name}.`)
	return /** @type {LocalizedString} */ (`Lekcja czeka na: ${i?.name}.`)
});