/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Parent_Workspace_TabsInputs */



/**
* | output |
* | --- |
* | "Chat and lesson" |
*
* @param {Parent_Workspace_TabsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_workspace_tabs = /** @type {((inputs?: Parent_Workspace_TabsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Parent_Workspace_TabsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("Chat and lesson")
	return /** @type {LocalizedString} */ ("Rozmowa i lekcja")
});