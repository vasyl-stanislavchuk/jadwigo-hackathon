/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ step: NonNullable<unknown> }} Chat_Lesson_StepInputs */



/**
* | output |
* | --- |
* | "Step {step}" |
*
* @param {Chat_Lesson_StepInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_step = /** @type {((inputs: Chat_Lesson_StepInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Lesson_StepInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Step ${i?.step}`)
	return /** @type {LocalizedString} */ (`Krok ${i?.step}`)
});