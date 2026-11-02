/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Overview_EmptyInputs */



/**
* | output |
* | --- |
* | "Week by week, how learning goes appears here after the first lesson." |
*
* @param {Parent_Overview_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_overview_empty = /** @type {((inputs?: Parent_Overview_EmptyInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Overview_EmptyInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Week by week, how learning goes appears here after the first lesson.")
	return /** @type {LocalizedString} */ ("Tu pojawi się tydzień po tygodniu, jak idzie nauka, po pierwszej lekcji.")
});