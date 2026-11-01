/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ cmd: NonNullable<unknown> }} Code_CopyInputs */



/**
* | output |
* | --- |
* | "Copy: {cmd}" |
*
* @param {Code_CopyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const code_copy = /** @type {((inputs: Code_CopyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Code_CopyInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Copy: ${i?.cmd}`)
	return /** @type {LocalizedString} */ (`Skopiuj: ${i?.cmd}`)
});