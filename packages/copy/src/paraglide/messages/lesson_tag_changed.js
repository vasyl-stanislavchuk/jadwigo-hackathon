/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Lesson_Tag_ChangedInputs */



/**
* | output |
* | --- |
* | "changed" |
*
* @param {Lesson_Tag_ChangedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const lesson_tag_changed = /** @type {((inputs?: Lesson_Tag_ChangedInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Lesson_Tag_ChangedInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("changed")
	return /** @type {LocalizedString} */ ("zmienione")
});