/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Contest_Task_ImageInputs */



/**
* | output |
* | --- |
* | "A task from the Alfik contest" |
*
* @param {Contest_Task_ImageInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const contest_task_image = /** @type {((inputs?: Contest_Task_ImageInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Contest_Task_ImageInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("A task from the Alfik contest")
	return /** @type {LocalizedString} */ ("Zadanie z konkursu Alfik")
});