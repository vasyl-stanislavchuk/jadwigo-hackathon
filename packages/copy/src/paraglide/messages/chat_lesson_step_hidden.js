/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ step: NonNullable<unknown> }} Chat_Lesson_Step_HiddenInputs */



/**
* | output |
* | --- |
* | "Step {step} can't be shown yet." |
*
* @param {Chat_Lesson_Step_HiddenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_step_hidden = /** @type {((inputs: Chat_Lesson_Step_HiddenInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Lesson_Step_HiddenInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Step ${i?.step} can't be shown yet.`)
	return /** @type {LocalizedString} */ (`Kroku ${i?.step} nie da się jeszcze pokazać.`)
});