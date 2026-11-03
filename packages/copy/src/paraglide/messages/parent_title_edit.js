/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ title: NonNullable<unknown> }} Parent_Title_EditInputs */



/**
* | output |
* | --- |
* | "Change the title: {title}" |
*
* @param {Parent_Title_EditInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_title_edit = /** @type {((inputs: Parent_Title_EditInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Title_EditInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Change the title: ${i?.title}`)
	return /** @type {LocalizedString} */ (`Zmień tytuł: ${i?.title}`)
});