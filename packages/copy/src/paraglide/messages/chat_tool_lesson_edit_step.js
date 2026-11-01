/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ step: NonNullable<unknown> }} Chat_Tool_Lesson_Edit_StepInputs */



/**
* | output |
* | --- |
* | "Changing step {step}" |
*
* @param {Chat_Tool_Lesson_Edit_StepInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lesson_edit_step = /** @type {((inputs: Chat_Tool_Lesson_Edit_StepInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Chat_Tool_Lesson_Edit_StepInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Changing step ${i?.step}`)
	return /** @type {LocalizedString} */ (`Zmieniam krok ${i?.step}`)
});